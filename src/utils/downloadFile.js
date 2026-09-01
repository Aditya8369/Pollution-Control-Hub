/**
 * Handing the browser a generated file, without leaking the blob behind it.
 *
 * `URL.createObjectURL(blob)` pins its blob in memory for the lifetime of the document.
 * A component that creates one per download and never revokes it — which is what both
 * branches of the compliance report download did — holds every report a visitor has ever
 * exported until the tab is closed. Nothing about that failure is visible: the download
 * works, and the memory is only noticeable after a long session.
 *
 * The anchor is also attached to the document before the click. A detached anchor's
 * programmatic `download` click is ignored outright by some browsers, and the element is
 * removed again immediately afterwards so nothing accumulates in the DOM either.
 *
 * This was `downloadFile` inside `chartExport.js`, which got it right and kept it private.
 * It is here so callers that need it stop writing a fourth slightly-wrong copy.
 */

/**
 * Revoking too eagerly cancels the download in browsers that read the blob
 * asynchronously after the click, and revoking never leaks. One frame is enough for the
 * navigation to have been queued, and the timeout is a no-op in a test environment where
 * nothing renders.
 */
const REVOKE_DELAY_MS = 0;

/**
 * Prompts the browser to save `content` as a file.
 *
 * @param {BlobPart} content - The file's contents.
 * @param {string} mimeType - Content type, e.g. `text/csv;charset=utf-8`.
 * @param {string} filename - Suggested name, including its extension.
 * @returns {boolean} False when there is no DOM to download through (SSR, a worker).
 */
export function downloadFile(content, mimeType, filename) {
  if (typeof document === 'undefined' || typeof URL?.createObjectURL !== 'function') {
    return false;
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  // Keep it out of the tab order and out of the accessibility tree; it exists for one
  // synthetic click and is gone before anything could reach it.
  link.setAttribute('aria-hidden', 'true');
  link.style.display = 'none';

  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
  }

  return true;
}

/**
 * A filename component that is safe on every platform.
 *
 * Report names are built from user-chosen dates and a standard, and a stray `/` in a
 * filename is a silently truncated download on some platforms and a rejected one on
 * others. Leading dots and dashes are stripped as well, so nothing produced here can be
 * read as a relative path or mistaken for a command-line flag.
 *
 * @param {unknown} part
 * @param {string} [fallback='report']
 * @returns {string}
 */
export function safeFilenamePart(part, fallback = 'report') {
  const text = String(part ?? '').trim();
  const cleaned = text
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^[-.]+/, '')
    .replace(/[-.]+$/, '');
  return cleaned === '' ? fallback : cleaned;
}
