/**
 * Loading-screen timing. Change the numbers here and every loader follows.
 *
 *  - TARGET_MS   the progress bar fills from 0 to ~90% over this window.
 *  - TIMEOUT_MS  if the page still hasn't rendered by now, the loader
 *                swaps to a "taking longer than expected" message with a
 *                Retry button instead of spinning forever.
 */
export const LOADING_TARGET_MS = 3000;
export const LOADING_TIMEOUT_MS = 10000;
