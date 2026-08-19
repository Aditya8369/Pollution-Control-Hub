import { describe, it, expect, vi, beforeEach } from "vitest";
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
    it("should render SVG to canvas and trigger download", () => {
      const container = document.createElement("div");
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      container.appendChild(svg);

      const link = document.createElement("a");
      const clickSpy = vi.fn();
      link.click = clickSpy;
      
      vi.spyOn(document, "createElement").mockImplementation((tagName) => {
        if (tagName === "a") return link;
        if (tagName === "canvas") {
          const mockCanvas = /** @type {any} */ (document.createElementNS("http://www.w3.org/1999/xhtml", "canvas"));
          mockCanvas.getContext = () => ({
            scale: vi.fn(),
            drawImage: vi.fn(),
            clearRect: vi.fn(),
          });
          mockCanvas.toBlob = (callback) => callback(new Blob(["mock-png"], { type: "image/png" }));
          return mockCanvas;
        }
        return document.createElementNS("http://www.w3.org/1999/xhtml", tagName);
      });

      exportToPNG(container, "test-chart.png");
      
      // Since toBlob callback is async inside onload, let's wait a bit
      setTimeout(() => {
        expect(clickSpy).toHaveBeenCalled();
        expect(link.download).toBe("test-chart.png");
      }, 50);
    });
  });
});
