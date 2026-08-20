/**
 * Utility to export SVG-based charts (like Recharts) to SVG and PNG formats.
 */

/**
 * Extracts relevant CSS rules (Recharts styling, CSS variables) to embed in the exported SVG
 * so that styling (like gridlines, colors, labels) is preserved.
 * @returns {string}
 */
export function getEmbeddedStyles() {
  const rules = [];
  try {
    const sheets = Array.from(document.styleSheets);
    for (const sheet of sheets) {
      try {
        const cssRules = sheet.cssRules || sheet.rules;
        if (!cssRules) continue;
        const rulesList = Array.from(cssRules);
        for (const rule of rulesList) {
          const styleRule = /** @type {CSSStyleRule} */ (rule);
          if (styleRule.selectorText) {
            const selector = styleRule.selectorText.toLowerCase();
            // Capture recharts rules, css variables, and theme definitions
            if (
              selector.includes("recharts") ||
              selector.includes(":root") ||
              selector.includes("high-contrast") ||
              selector.includes("dark")
            ) {
              rules.push(styleRule.cssText);
            }
          }
        }
      } catch {
        // A stylesheet from another origin throws on `cssRules` access. There is
        // nothing to recover — the rules are simply not readable — so the export
        // continues with whatever same-origin sheets it could reach.
      }
    }
  } catch (e) {
    console.error("Failed to extract styles for export:", e);
  }
  return rules.join("\n");
}

/**
 * Serializes an SVG element into a complete, self-contained SVG string.
 * @param {SVGElement} svgElement
 * @returns {string}
 */
export function serializeSVG(svgElement) {
  if (!svgElement) return "";
  const clone = /** @type {SVGElement} */ (svgElement.cloneNode(true));

  // Set explicit dimensions if missing
  const rect = svgElement.getBoundingClientRect();
  const width = rect.width || 800;
  const height = rect.height || 400;

  if (!clone.getAttribute("width")) clone.setAttribute("width", width.toString());
  if (!clone.getAttribute("height")) clone.setAttribute("height", height.toString());
  if (!clone.getAttribute("viewBox")) {
    clone.setAttribute("viewBox", `0 0 ${width} ${height}`);
  }

  // Embed styles to ensure fonts, colors, and variables resolve
  const styleEl = document.createElementNS("http://www.w3.org/2000/svg", "style");
  styleEl.textContent = getEmbeddedStyles();
  clone.insertBefore(styleEl, clone.firstChild);

  const serializer = new XMLSerializer();
  return serializer.serializeToString(clone);
}

/**
 * Downloads a string content as a file.
 * @param {string} content
 * @param {string} mimeType
 * @param {string} filename
 */
function downloadFile(content, mimeType, filename) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports the chart SVG to a standalone .svg file.
 *
 * @param {Element} containerElement - Element containing the svg
 * @param {string} filename
 * @returns {boolean} Whether there was a chart to export.
 */
export function exportToSVG(containerElement, filename = "chart.svg") {
  const svg = containerElement?.querySelector("svg");
  if (!svg) {
    // Returning false rather than logging: the caller is a click handler and is the
    // only place that knows how to tell the person in front of it.
    return false;
  }
  const svgString = serializeSVG(svg);
  downloadFile(svgString, "image/svg+xml;charset=utf-8", filename);
  return true;
}

/**
 * Exports the chart SVG to a .png file with high-DPI resolution support.
 *
 * Returns a promise so a caller can tell a finished export from a failed one. It used to
 * return `undefined` the instant it started the `img.onload` -> `canvas.toBlob` ->
 * `link.click()` chain, which meant a silent failure was indistinguishable from success —
 * `AnalyticsInsights` calls this from a click handler and had nothing to branch on. It is
 * also why the test for it had to guess at a `setTimeout(..., 50)`: there was nothing to
 * await, so the assertion fired after the test had already passed and escaped as an
 * unhandled error (#904).
 *
 * @param {Element} containerElement - Element containing the svg
 * @param {string} filename
 * @param {number} scaleMultiplier - Quality scale factor (defaults to 2 for crisp resolution)
 * @returns {Promise<void>} Resolves once the download has been triggered.
 */
export function exportToPNG(containerElement, filename = "chart.png", scaleMultiplier = 2) {
  const svg = containerElement?.querySelector("svg");
  if (!svg) {
    return Promise.reject(new Error("No SVG element found for export"));
  }

  const svgString = serializeSVG(svg);
  const rect = svg.getBoundingClientRect();
  const width = rect.width || 800;
  const height = rect.height || 400;

  // Use higher device pixel ratio or specified multiplier
  const dpr = scaleMultiplier || window.devicePixelRatio || 1;

  const canvas = document.createElement("canvas");
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return Promise.reject(new Error("Failed to get a 2d canvas context"));
  }

  // Handle high-DPI scaling
  ctx.scale(dpr, dpr);

  const img = new Image();
  const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  return new Promise((resolve, reject) => {
    img.onload = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to PNG blob and download
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);

        if (!blob) {
          // Previously this branch did nothing at all, so a canvas the browser
          // refused to encode looked exactly like a successful export.
          reject(new Error("The canvas could not be encoded as a PNG"));
          return;
        }

        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        resolve();
      }, "image/png");
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load the chart SVG into an image for PNG conversion"));
    };

    img.src = url;
  });
}
