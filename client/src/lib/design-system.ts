/**
 * EZER Auto Import Design System
 * Integrated Ecosystem Design Tokens
 */

// Spacing Scale (4/8/12/24px equivalents via Tailwind with responsive variants)
export const SPACING = {
  SECTION: 'px-4 py-6 sm:px-6 sm:py-8 lg:px-8', // Responsive section padding
  CARD: 'p-6',         // Card content padding
  CARD_COMPACT: 'p-4', // Compact card padding
  GRID_GAP: 'gap-6',   // Grid gap between elements
  STACK: 'space-y-6',  // Vertical stack spacing
  INLINE: 'gap-4',     // Inline element spacing
} as const;

// Typography Ramp
export const TYPOGRAPHY = {
  HEADING_XL: 'text-3xl font-bold',
  HEADING_LG: 'text-2xl font-semibold',
  HEADING_MD: 'text-xl font-semibold',
  HEADING_SM: 'text-lg font-semibold',
  BODY_LG: 'text-base',
  BODY_MD: 'text-sm',
  BODY_SM: 'text-xs',
  LABEL: 'text-xs font-medium uppercase tracking-wide',
} as const;

// Module Color Accents
export const MODULE_COLORS = {
  OPERATIONS: {
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-600 dark:text-indigo-400',
    border: 'border-indigo-500/20',
    badge: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20',
  },
  FINANCIALS: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/20',
    badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  },
  NETWORK: {
    bg: 'bg-violet-500/10',
    text: 'text-violet-600 dark:text-violet-400',
    border: 'border-violet-500/20',
    badge: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20',
  },
  COMPLIANCE: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/20',
    badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
  },
} as const;

// Icon Sizes
export const ICON_SIZES = {
  SM: 'h-4 w-4',  // 16px - sidebar, inline elements
  MD: 'h-5 w-5',  // 20px - cards, buttons
  LG: 'h-6 w-6',  // 24px - page headers
  XL: 'h-8 w-8',  // 32px - hero sections
} as const;

// Status Badge Configuration
export const STATUS_CONFIG = {
  // Vehicle statuses
  in_transit: {
    label: 'In Transit',
    variant: 'secondary' as const,
    color: 'text-blue-600 dark:text-blue-400',
  },
  in_stock: {
    label: 'In Stock',
    variant: 'secondary' as const,
    color: 'text-green-600 dark:text-green-400',
  },
  sold: {
    label: 'Sold',
    variant: 'default' as const,
    color: 'text-primary',
  },
  
  // Shipment statuses
  planned: {
    label: 'Planned',
    variant: 'secondary' as const,
    color: 'text-muted-foreground',
  },
  in_ground_transit: {
    label: 'Ground Transit',
    variant: 'secondary' as const,
    color: 'text-blue-600 dark:text-blue-400',
  },
  at_port: {
    label: 'At Port',
    variant: 'secondary' as const,
    color: 'text-indigo-600 dark:text-indigo-400',
  },
  on_vessel: {
    label: 'On Vessel',
    variant: 'secondary' as const,
    color: 'text-purple-600 dark:text-purple-400',
  },
  arrived: {
    label: 'Arrived',
    variant: 'default' as const,
    color: 'text-emerald-600 dark:text-emerald-400',
  },
  customs_cleared: {
    label: 'Cleared',
    variant: 'default' as const,
    color: 'text-green-600 dark:text-green-400',
  },
  completed: {
    label: 'Completed',
    variant: 'default' as const,
    color: 'text-success',
  },
  
  // Payment statuses
  paid: {
    label: 'Paid',
    variant: 'default' as const,
    color: 'text-success',
  },
  pending: {
    label: 'Pending',
    variant: 'secondary' as const,
    color: 'text-yellow-600 dark:text-yellow-400',
  },
  overdue: {
    label: 'Overdue',
    variant: 'destructive' as const,
    color: 'text-destructive',
  },
} as const;

// Card Archetypes
export const CARD_STYLES = {
  METRIC: `${SPACING.CARD} rounded-lg border border-border bg-card hover-elevate`,
  SUMMARY: `${SPACING.CARD} rounded-lg border border-border bg-card`,
  TABLE_WRAPPER: 'rounded-lg border border-border overflow-hidden',
} as const;
