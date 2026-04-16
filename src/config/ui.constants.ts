/**
 * Visual / UI defaults for the live display. Spinners, colors, and display layout values live here.
 * Timing/interval values belong in defaults.constants.ts.
 */

/** Spinner frames shown while repo data is being fetched. */
export const SPINNER_SEQUENCE = ['|', '/', '-', '\\'] as const;

/** How fast the spinner advances (ms per frame). */
export const SPINNER_INTERVAL_MS = 80;

/**
 * Hotkey that toggles between full and compact PR list views in `gli live`. Change this value here to remap
 * the key.
 */
export const COMPACT_TOGGLE_KEY = {
  label: 'space',
  binding: ' ',
};

/**
 * Number of characters to skip from the start of a PR title before truncating. Useful when all titles share a
 * common prefix (e.g. a ticket number) that you'd rather omit from the display. Writable to
 * ~/.config/gli/config.json via prListing.title.sliceStart.
 */
export const DEFAULT_PR_TITLE_SLICE_START = 0;
