import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getEmbeddedStyles, serializeSVG, exportToSVG, exportToPNG } from "./chartExport";

describe("chartExport", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    if (typeof window !== "undefined") {
      window.URL.createObjectURL = vi.fn(() => "blob:http://localhost/mock-uuid");
      window.URL.revokeObjectURL = vi.fn();
    }
  });

  describe("getEmbeddedStyles", () => {
    it("should retrieve css rules matching recharts", () => {
      // Mock document.styleSheets
      const originalStyleSheets = Object.getOwnPropertyDescriptor(document, "styleSheets");
      
      const mockRules = [
        { selectorText: ".recharts-line", cssText: ".recharts-line { stroke: red; }" },
        { selectorText: ".some-other-class", cssText: ".some-other-class { display: block; }" },
        { selectorText: ":root", cssText: ":root { --line: #ccc; }" }
      ];

      Object.defineProperty(document, "styleSheets", {
        configurable: true,
        value: [{
          cssRules: mockRules
        }]
      });

      const styles = getEmbeddedStyles();
      expect(styles).toContain(".recharts-line { stroke: red; }");
      expect(styles).toContain(":root { --line: #ccc; }");
      expect(styles).not.toContain(".some-other-class { display: block; }");

      // Restore original styleSheets if it existed
      if (originalStyleSheets) {
        Object.defineProperty(document, "styleSheets", originalStyleSheets);
      }
    });
  });

  describe("serializeSVG", () => {
    it("should clone and serialize SVG elements", () => {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("width", "400");
      svg.setAttribute("height", "200");
      
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      svg.appendChild(rect);

      const serialized = serializeSVG(svg);
      expect(serialized).toContain("<svg");
      expect(serialized).toContain("width=\"400\"");
      expect(serialized).toContain("height=\"200\"");
      expect(serialized).toContain("<rect");
      expect(serialized).toContain("<style");
    });
  });

  describe("exportToSVG", () => {
    it("should trigger download for SVG", () => {
      const container = document.createElement("div");
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      container.appendChild(svg);

      const link = document.createElement("a");
      const clickSpy = vi.fn();
      link.click = clickSpy;
      
      vi.spyOn(document, "createElement").mockImplementation((tagName) => {
        if (tagName === "a") return link;
        return document.createElementNS("http://www.w3.org/1999/xhtml", tagName);
      });

      exportToSVG(container, "test-chart.svg");
      expect(clickSpy).toHaveBeenCalled();
      expect(link.download).toBe("test-chart.svg");
    });
  });

  describe("exportToPNG", () => {
    /**
     * #904. This block used to assert inside a bare `setTimeout(..., 50)` with nothing
     * awaited, so the test was marked passed the instant `exportToPNG` returned and the
     * assertion fired 50 ms later with no test to belong to. Vitest caught it as an
     * unhandled error, which is why `npm run test:coverage` exited 1 while reporting
     * 1044/1044 passing.
     *
     * The assertion could never have held either: the download happens inside
     * `img.onload`, and jsdom does not load images, so `link.click()` was never reached.
     * The stub below fires `onload` on the next tick, which is what makes the export
     * observable at all.
     */
    let link;
    let clickSpy;
    let container;
    let imageInstances;

    /** Replaces `Image` with one that resolves or rejects on the next tick. */
    function stubImage(outcome) {
      imageInstances = [];
      class StubImage {
        constructor() {
          this.onload = null;
          this.onerror = null;
          imageInstances.push(this);
        }
        set src(value) {
          this._src = value;
          queueMicrotask(() => {
            if (outcome === "error") this.onerror?.(new Event("error"));
            else this.onload?.();
          });
        }
        get src() {
          return this._src;
        }
      }
      vi.stubGlobal("Image", StubImage);
    }

    /** A canvas whose `toBlob` yields `blob`. Pass `null` for an encoder that gave up. */
    function stubCanvas(blob) {
      const canvas = /** @type {any} */ (document.createElementNS("http://www.w3.org/1999/xhtml", "canvas"));
      canvas.getContext = () => ({ scale: vi.fn(), drawImage: vi.fn(), clearRect: vi.fn() });
      canvas.toBlob = (callback) => callback(blob);
      return canvas;
    }

    beforeEach(() => {
      container = document.createElement("div");
      container.appendChild(document.createElementNS("http://www.w3.org/2000/svg", "svg"));

      link = document.createElement("a");
      clickSpy = vi.fn();
      link.click = clickSpy;
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    /** Routes `<a>` and `<canvas>` creation to the stubs, leaving everything else alone. */
    function mockCreateElement(canvas) {
      vi.spyOn(document, "createElement").mockImplementation((tagName) => {
        if (tagName === "a") return link;
        if (tagName === "canvas") return canvas;
        return document.createElementNS("http://www.w3.org/1999/xhtml", tagName);
      });
    }

    it("renders the SVG to a canvas and triggers the download", async () => {
      stubImage("load");
      mockCreateElement(stubCanvas(new Blob(["mock-png"], { type: "image/png" })));

      await exportToPNG(container, "test-chart.png");

      expect(clickSpy).toHaveBeenCalled();
      expect(link.download).toBe("test-chart.png");
    });

    it("rejects when the SVG cannot be loaded into an image", async () => {
      stubImage("error");
      mockCreateElement(stubCanvas(new Blob(["mock-png"], { type: "image/png" })));

      // Previously this logged and returned, so the caller saw the same nothing it saw
      // on success.
      await expect(exportToPNG(container, "test-chart.png")).rejects.toThrow(/into an image/i);
      expect(clickSpy).not.toHaveBeenCalled();
    });

    it("rejects when the canvas cannot be encoded", async () => {
      stubImage("load");
      mockCreateElement(stubCanvas(null));

      // `if (blob)` with no else — a browser that refused to encode produced no file
      // and no message.
      await expect(exportToPNG(container, "test-chart.png")).rejects.toThrow(/encoded as a PNG/i);
      expect(clickSpy).not.toHaveBeenCalled();
    });

    it("rejects when the container holds no chart", async () => {
      await expect(exportToPNG(document.createElement("div"), "test-chart.png")).rejects.toThrow(
        /No SVG element/i
      );
    });

    it("releases both object URLs it created", async () => {
      stubImage("load");
      mockCreateElement(stubCanvas(new Blob(["mock-png"], { type: "image/png" })));
      const revoke = vi.spyOn(URL, "revokeObjectURL");

      await exportToPNG(container, "test-chart.png");

      // One for the SVG source, one for the PNG blob behind the link.
      expect(revoke).toHaveBeenCalledTimes(2);
    });
  });
});
