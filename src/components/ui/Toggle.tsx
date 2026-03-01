import { useCompactMode } from '../../hooks/useCompactMode';

export interface ToggleProps {
  /** Controlled checked state. */
  checked: boolean;
  /** Called with the new value when the user toggles. */
  onChange: (checked: boolean) => void;
  /** Disables the toggle — grays it out and ignores clicks. */
  disabled?: boolean;
  /**
   * Explicit size override.
   * When omitted, uses 'sm' in compact mode and 'md' otherwise.
   */
  size?: 'sm' | 'md';
  /**
   * Accessible name announced by screen readers.
   * Always provide this when there is no visible sibling <label>.
   */
  label?: string;
  /** Forwarded to the underlying <button> element. */
  id?: string;
  /** Extra Tailwind classes applied to the track (outermost element). */
  className?: string;
}

/**
 * Track + thumb dimensions for each size variant.
 * `sm` is used automatically in compact mode; `md` in normal mode.
 */
const SIZES = {
  sm: { track: 'w-9 h-5',  thumb: 'w-4 h-4', translate: 'translate-x-4' },
  md: { track: 'w-11 h-6', thumb: 'w-5 h-5', translate: 'translate-x-5' },
} as const;

/**
 * A fully-accessible toggle switch following the WAI-ARIA Switch pattern.
 *
 * Key design decisions:
 * - Uses `<button role="switch">` (not a checkbox) so that both Enter and
 *   Space trigger the toggle natively without custom key-handlers.
 * - Visual state is driven by React props (not CSS `peer-checked:`) so it
 *   works regardless of DOM nesting depth.
 * - Automatically shrinks to the 'sm' variant when compact mode is active,
 *   unless an explicit `size` prop overrides this.
 * - Dark-mode colours are handled via Tailwind `dark:` variants, removing
 *   the need to pass an `isDark` prop from every call-site.
 * - `focus-visible` ring provides keyboard discoverability without showing
 *   an outline on mouse clicks.
 *
 * @example
 * // Auto-sizing (compact-mode aware)
 * <Toggle checked={isOn} onChange={setIsOn} label="Feature name" />
 *
 * @example
 * // Always small (e.g. inline within a sentence)
 * <Toggle checked={value} onChange={setValue} size="sm" label="Auto-compact" />
 */
export default function Toggle({
  checked,
  onChange,
  disabled = false,
  size,
  label,
  id,
  className = '',
}: ToggleProps) {
  const isCompact = useCompactMode();
  const s = SIZES[size ?? (isCompact ? 'sm' : 'md')];

  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={[
        // Layout
        'relative inline-flex flex-shrink-0 cursor-pointer rounded-full',
        // Remove browser default border
        'border-2 border-transparent',
        // Track colour: theme-primary when on, gray when off (light + dark)
        checked
          ? 'bg-theme-primary'
          : 'bg-gray-300 dark:bg-gray-600',
        // Smooth colour transition
        'transition-colors duration-200 ease-in-out',
        // Keyboard focus ring (only for keyboard navigation)
        'focus-visible:outline-none',
        'focus-visible:ring-2 focus-visible:ring-theme-primary/70',
        // Disabled state
        'disabled:opacity-50 disabled:cursor-not-allowed',
        // Size variant
        s.track,
        // Caller overrides
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Hidden text for assistive technologies */}
      {label && <span className="sr-only">{label}</span>}

      {/* The moving thumb */}
      <span
        aria-hidden="true"
        className={[
          'pointer-events-none inline-block rounded-full bg-white shadow-sm',
          'transition-transform duration-200 ease-in-out',
          s.thumb,
          checked ? s.translate : 'translate-x-0',
        ].join(' ')}
      />
    </button>
  );
}
