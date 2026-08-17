/**
 * Copying text to the clipboard, and reporting honestly whether it worked.
 *
 * `navigator.clipboard.writeText(text)` on its own is not a copy — it is a
 * promise. It is undefined entirely on non-secure origins, and it rejects when
 * the document isn't focused or permission is denied. Calling it un-awaited and
 * then flipping the button to "✓ Copied!" tells the user something happened that
 * may not have, and leaves the rejection unhandled.
 *
 * @param {string} text
 * @returns {Promise<boolean>} Whether the text is actually on the clipboard.
 */
export async function copyText(text) {
  if (typeof text !== 'string' || text === '') return false;

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through — an insecure origin or a denied permission can still
      // sometimes be served by the legacy path below.
    }
  }

  return legacyCopy(text);
}

/**
 * The pre-Clipboard-API path, for insecure origins and older browsers.
 *
 * @param {string} text
 * @returns {boolean}
 */
function legacyCopy(text) {
  if (typeof document === 'undefined' || typeof document.execCommand !== 'function') {
    return false;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  // Keep it out of view and out of the tab order, and stop iOS scrolling to it.
  textarea.setAttribute('readonly', '');
  textarea.setAttribute('aria-hidden', 'true');
  textarea.style.position = 'fixed';
  textarea.style.top = '-9999px';
  textarea.style.opacity = '0';

  document.body.appendChild(textarea);

  try {
    textarea.select();
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}
