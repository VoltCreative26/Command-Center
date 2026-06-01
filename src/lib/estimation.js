export const CATEGORIES = [
  'Admin',
  'Design & Production',
  'Web & Digital',
  'Strategy & Planning',
  'Marketing & R&D',
  'Misc',
]

export const DEFAULT_CATEGORY = 'Admin'

// Classify a task once both estimated and actual minutes exist.
// over  → finished in < 80% of estimate
// accurate → within ±20% of estimate
// under → took > 120% of estimate
export function classify(estimated, actual) {
  if (!estimated || actual == null) return null
  const ratio = actual / estimated
  if (ratio < 0.8) return 'over'
  if (ratio > 1.2) return 'under'
  return 'accurate'
}

// Corrected color mapping (redesign): over=blue, accurate=green, under=red.
export const CLASS_META = {
  over: { label: 'Over-estimated', tone: 'blue', blurb: 'Finished faster than planned' },
  accurate: { label: 'Accurate', tone: 'green', blurb: 'Within ±20% of estimate' },
  under: { label: 'Under-estimated', tone: 'red', blurb: 'Took longer than planned' },
}

// Format a delta value (actual − estimated) as +15m / −30m / ±0m.
// Minus is U+2212 (−), not a hyphen.
export function formatDelta(delta) {
  const sign = delta > 0 ? '+' : delta < 0 ? '−' : '±'
  return `${sign}${Math.abs(delta)}m`
}
