/**
 * The single source of measurements for FrenOS XP chrome.
 *
 * Values follow Windows XP "Luna" at 96 DPI (title bar, frame, Tahoma 8 pt,
 * 23 px push buttons, 30 px taskbar), expressed in logical stage px. The stage
 * is scaled so that one logical px always lands on a whole number of device
 * px, which keeps the pixel-art icons and wallpaper crisp.
 *
 * Every value must be an integer: a fractional metric is a bug.
 */
export const METRICS = {
  /* ── window frame ────────────────────────────────────────────────────── */
  frame: 3,
  frameRadius: 8,
  captionH: 26,
  captionBtn: 21,
  captionIcon: 16,
  resizeEdge: 5,
  resizeGrip: 14,

  /* ── push buttons & toolbars ─────────────────────────────────────────── */
  btnH: 23,
  btnMinW: 75,
  btnPadX: 12,
  btnRadius: 3,
  toolbarBtnH: 30,

  /* ── menus ───────────────────────────────────────────────────────────── */
  menuH: 20,
  menuItemH: 20,
  menuGutter: 26,
  menuMinW: 156,

  /* ── fields & choices ────────────────────────────────────────────────── */
  fieldH: 21,
  check: 13,
  radio: 13,
  choiceGap: 6,
  rangeTrack: 4,
  rangeThumbW: 11,
  rangeThumbH: 19,
  groupPad: 10,
  tabH: 21,

  /* ── scrollbars, status, progress ────────────────────────────────────── */
  scrollbar: 17,
  statusH: 22,
  progressH: 14,

  /* ── desktop icons ───────────────────────────────────────────────────── */
  icon: 32,
  iconSmall: 16,
  iconCellW: 78,
  iconCellH: 72,
  iconOrigin: 8,
  iconGap: 4,

  /* ── taskbar ─────────────────────────────────────────────────────────── */
  taskbarH: 30,
  startW: 100,
  taskBtnH: 24,
  taskBtnMinW: 44,
  taskBtnMaxW: 164,
  trayIcon: 16,

  /* ── start menu & balloons ───────────────────────────────────────────── */
  startMenuW: 384,
  startUserH: 56,
  startFooterH: 40,
  balloonW: 272,

  /* ── focus & type ────────────────────────────────────────────────────── */
  focusInset: 3,
  textUi: 11,
  textTitle: 13,
} as const satisfies Record<string, number>;

export type MetricKey = keyof typeof METRICS;
export type Metrics = { readonly [K in MetricKey]: number };

for (const [key, value] of Object.entries(METRICS)) {
  if (!Number.isInteger(value)) {
    throw new Error(`Metric "${key}" must be an integer, got ${value}`);
  }
}
