/**
 * Shared UI primitive components.
 *
 * These are application-aware primitives — they may consume app contexts
 * (e.g. compact mode, theme) so they stay decoupled from business logic
 * while automatically reflecting global UI settings.
 */
export { default as Toggle } from './Toggle';
export type { ToggleProps } from './Toggle';
