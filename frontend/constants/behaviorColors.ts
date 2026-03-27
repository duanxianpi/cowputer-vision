/**
 * Unified behavior color palette
 */

/** Hex color for each specific behavior (canvas / ECharts). */
export const BEHAVIOR_HEX: Record<string, string> = {
  feeding_head_down: '#2e8b57', // SeaGreen
  feeding_head_up:    '#7cb342', // Light Olive
  walking:           '#eab308', // Yellow 500
  standing:          '#94a3b8', // Slate 400
  lying:             '#5c6bc0', // Light Indigo
};

/** Fallback hex color when behavior is unknown. */
export const BEHAVIOR_HEX_DEFAULT = '#ef4444'; // Red 500

/** Resolve any behavior string to a hex color (handles grouped keys). */
export function getBehaviorHex(behavior: string): string {
  const key = behavior.toLowerCase();
  if (BEHAVIOR_HEX[key]) return BEHAVIOR_HEX[key];
  // Grouped fallbacks: "feeding" → feeding_head_down color
  if (key === 'feeding') return BEHAVIOR_HEX.feeding_head_down;
  if (key === 'resting') return BEHAVIOR_HEX.lying;
  return BEHAVIOR_HEX_DEFAULT;
}

/** Tailwind badge classes (bg + text) keyed by grouped behavior category. */
export const BEHAVIOR_BADGE: Record<string, string> = {
  feeding:  'bg-emerald-100 text-emerald-800', 
  walking:  'bg-yellow-100 text-yellow-800',   
  standing: 'bg-slate-100 text-slate-800',     
  resting:  'bg-indigo-100 text-indigo-800',   
};

export const BEHAVIOR_BADGE_DEFAULT = 'bg-gray-100 text-gray-800';

/** Resolve any behavior string to Tailwind badge classes. */
export function getBehaviorBadge(behavior: string): string {
  const key = behavior.toLowerCase();
  if (BEHAVIOR_BADGE[key]) return BEHAVIOR_BADGE[key];
  if (key.startsWith('feeding')) return BEHAVIOR_BADGE.feeding;
  if (key === 'lying') return BEHAVIOR_BADGE.resting;
  return BEHAVIOR_BADGE_DEFAULT;
}

/** Human-readable labels for each behavior. */
export const BEHAVIOR_LABELS: Record<string, string> = {
  feeding_head_down: 'Feeding (Head Down)',
  feeding_head_up:   'Feeding (Head Up)',
  walking:           'Walking',
  standing:          'Standing',
  lying:             'Resting',
};

/**
 * Series-name → hex color for ECharts (matches grouped labels used in
 * CPDoughnutPlot / CPStackAreaPlot).
 */
export const SERIES_COLORS: Record<string, string> = {
  'Feeding':           BEHAVIOR_HEX.feeding_head_down,
  'Walking/Standing':  BEHAVIOR_HEX.walking,
  'Resting':           BEHAVIOR_HEX.lying,
};

/** Resolve a chart series name to its hex color. */
export function getSeriesColor(name: string): string {
  return SERIES_COLORS[name] ?? BEHAVIOR_HEX_DEFAULT;
}
