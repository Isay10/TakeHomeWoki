// =============================================================================
// Color Constants - For TypeScript/JavaScript usage
// =============================================================================

// Status colors for reservations
export const STATUS_COLORS = {
  PENDING: '#FCD34D',
  CONFIRMED: '#3B82F6',
  SEATED: '#10B981',
  FINISHED: '#9CA3AF',
  NO_SHOW: '#EF4444',
  CANCELLED: '#6B7280',
} as const;

// Selection styling
export const SELECTION = {
  outline: 'rgba(249, 115, 22, 0.85)',
  shadow: 'rgba(249, 115, 22, 0.25)',
} as const;

// Shadow colors
export const SHADOWS = {
  block: 'rgba(0, 0, 0, 0.18)',
} as const;

// Border colors
export const BORDERS = {
  dark: 'rgba(0, 0, 0, 0.15)',
} as const;

// Legend pattern colors
export const LEGEND_PATTERNS = {
  stripeWhite: 'rgba(255, 255, 255, 0.55)',
  stripeTransparent: 'rgba(0, 0, 0, 0)',
} as const;

// Helper to get a striped pattern for cancelled items
export const getStripedPattern = () =>
  `repeating-linear-gradient(45deg, ${LEGEND_PATTERNS.stripeWhite}, ${LEGEND_PATTERNS.stripeWhite} 4px, ${LEGEND_PATTERNS.stripeTransparent} 4px, ${LEGEND_PATTERNS.stripeTransparent} 8px)`;

// Helper to get box shadow for selected blocks
export const getSelectedBoxShadow = () =>
  `0 0 0 3px ${SELECTION.shadow}, 0 6px 18px ${SHADOWS.block}`;

// Helper to get default block box shadow
export const getBlockBoxShadow = () =>
  `0 6px 18px ${SHADOWS.block}`;

// Type for status keys
export type StatusColorKey = keyof typeof STATUS_COLORS;
