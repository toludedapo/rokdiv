/**
 * ROKDIV Design Tokens
 * Apple-system-inspired: near-black/gray neutrals, color reserved strictly
 * for operational signals. No brand/mood color — restraint is the identity.
 *
 * Rule: every color below has exactly ONE meaning, used consistently
 * everywhere in the app. Never repurpose green for anything but
 * "healthy/paid/success", never repurpose red for anything but
 * "overdue/error/urgent".
 */

export const theme = {
  // ── Neutrals (90% of all UI) ──────────────────────────────────────────
  neutral: {
    black:        '#000000',  // true black — hero/dark cards
    nearBlack:    '#0D0D0D',  // hero card background (dashboard ring card)
    surfaceDark:  '#1C1C1E',  // secondary dark surface
    gray:         '#8E8E93',  // secondary text, neutral/routine info
    grayLight:    '#C7C7CC',  // tertiary text, placeholders
    borderLight:  '#E5E5EA',  // hairline borders on light surfaces
    surfaceLight: '#F2F2F7',  // light mode card background
    offWhite:     '#FAFAFA',  // page background, light mode
    white:        '#FFFFFF',
  },

  // ── Text ───────────────────────────────────────────────────────────────
  text: {
    primaryDark:   '#FFFFFF',   // primary text on dark surfaces
    primaryLight:  '#000000',   // primary text on light surfaces
    secondary:     '#8E8E93',   // works on both — system gray
    tertiaryDark:  'rgba(255,255,255,0.45)',
    tertiaryLight: 'rgba(0,0,0,0.45)',
  },

  // ── Signal colors — fixed meaning, no exceptions ───────────────────────
  signal: {
    green:  '#34C759',  // healthy stock · paid/settled · success confirmation
    red:    '#FF453A',  // overdue credit · error · urgent action needed
    orange: '#FF9F0A',  // low stock warning · attention needed soon
    blue:   '#0A84FF',  // primary action / link (use sparingly — taps, not status)
  },

  // ── Signal tints (for pill backgrounds, e.g. "Healthy" badge) ─────────
  signalTint: {
    green:  'rgba(52,199,89,0.16)',
    red:    'rgba(255,69,58,0.16)',
    orange: 'rgba(255,159,10,0.16)',
    blue:   'rgba(10,132,255,0.16)',
  },

  // ── Radii ──────────────────────────────────────────────────────────────
  radius: {
    sm: 10,
    md: 14,
    lg: 16,
    xl: 20,
  },

  // ── Type scale (mobile-first) ───────────────────────────────────────────
  type: {
    hero:     { size: 64, weight: 500, tracking: '-0.03em' }, // the one big number
    title:    { size: 22, weight: 500, tracking: '-0.02em' }, // greeting / page title
    statLg:   { size: 26, weight: 500, tracking: '-0.02em' }, // KPI card numbers
    body:     { size: 14, weight: 400, tracking: '0' },
    label:    { size: 12, weight: 500, tracking: '0.01em' },
    caption:  { size: 11, weight: 400, tracking: '0' },
  },
}

/**
 * Semantic helpers — use these in components instead of raw theme values,
 * so meaning stays explicit at the call site.
 */
export const signal = {
  healthy:  theme.signal.green,
  paid:     theme.signal.green,
  success:  theme.signal.green,
  overdue:  theme.signal.red,
  error:    theme.signal.red,
  urgent:   theme.signal.red,
  warning:  theme.signal.orange,
  lowStock: theme.signal.orange,
  action:   theme.signal.blue,
  neutral:  theme.neutral.gray,
}

export const signalTintFor = (key) => {
  const map = {
    healthy: theme.signalTint.green, paid: theme.signalTint.green, success: theme.signalTint.green,
    overdue: theme.signalTint.red, error: theme.signalTint.red, urgent: theme.signalTint.red,
    warning: theme.signalTint.orange, lowStock: theme.signalTint.orange,
    action: theme.signalTint.blue,
  }
  return map[key] || 'rgba(142,142,147,0.16)'
}

export default theme
