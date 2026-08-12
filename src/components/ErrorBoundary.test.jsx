import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import ErrorBoundary from "./ErrorBoundary";
import { logger } from "../utils/logger";

function Bomb() {
  throw new Error("Boom");
}

describe("ErrorBoundary", () => {
  let reloadSpy;

  beforeEach(() => {
    vi.spyOn(logger, "error").mockImplementation(() => {});
    // jsdom throws for direct assignment to window.location.reload,
    // so replace the whole location object with a stub.
    reloadSpy = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, reload: reloadSpy },
    });
    // Silence React's own error boundary console logging noise.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders children when there is no error", () => {
    render(
      <ErrorBoundary>
        <div>All good</div>
      </ErrorBoundary>
    );

    expect(screen.getByText("All good")).toBeInTheDocument();
  });

  it("renders a user-friendly fallback UI when a child throws", () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("logs the error and component stack through the shared logger", () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );

    expect(logger.error).toHaveBeenCalledTimes(1);
    const [message, data] = logger.error.mock.calls[0];
    expect(message).toMatch(/ErrorBoundary/i);
    expect(data.message).toBe("Boom");
    expect(typeof data.componentStack).toBe("string");
  });

  it("provides a Reload Page button that reloads the current page", () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByRole("button", { name: /reload page/i }));
    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it("allows the error details section to be expanded and collapsed", () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );

    // Details are collapsed by default (native <details> element closed).
    const detailsEl = document.querySelector("details");
    expect(detailsEl.open).toBe(false);

    const toggle = screen.getByText(/show error details/i);
    fireEvent.click(toggle);
    expect(detailsEl.open).toBe(true);
    expect(screen.getAllByText(/Boom/).length).toBeGreaterThan(0);
    expect(screen.getByText(/hide error details/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/hide error details/i));
    expect(detailsEl.open).toBe(false);
  });
});