import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { SectionNav } from "../App";
import { ThemeProvider } from "../context/ThemeContext";

describe("SectionNav Component", () => {
  const onSectionChange = vi.fn();

  const renderSectionNav = (activeSection = "home") =>
    render(
      <ThemeProvider>
        <SectionNav activeSection={activeSection} onSectionChange={onSectionChange} />
      </ThemeProvider>
    );

  it("renders the desktop navigation bar and buttons", () => {
    renderSectionNav("home");

    const nav = screen.getByRole("navigation", { name: /main sections/i });
    expect(nav).toBeInTheDocument();

    const homeButtons = screen.getAllByRole("button", { name: "Home" });
    expect(homeButtons.length).toBeGreaterThan(0);
    expect(homeButtons[0]).toHaveClass("active");
  });

  it("renders the mobile hamburger button and toggles the mobile menu", () => {
    renderSectionNav("home");

    const hamburgerBtn = screen.getByRole("button", { name: /toggle navigation/i });
    expect(hamburgerBtn).toBeInTheDocument();
    expect(hamburgerBtn).toHaveAttribute("aria-expanded", "false");

    // Click to open menu
    fireEvent.click(hamburgerBtn);
    expect(hamburgerBtn).toHaveAttribute("aria-expanded", "true");

    const mobileMenu = document.getElementById("mobile-navigation");
    expect(mobileMenu).toBeInTheDocument();

    // Click to close menu
    fireEvent.click(hamburgerBtn);
    expect(hamburgerBtn).toHaveAttribute("aria-expanded", "false");
    expect(document.getElementById("mobile-navigation")).not.toBeInTheDocument();
  });

  it("calls onSectionChange and closes menu when a section is clicked in mobile view", () => {
    onSectionChange.mockClear();
    renderSectionNav("home");

    const hamburgerBtn = screen.getByRole("button", { name: /toggle navigation/i });
    fireEvent.click(hamburgerBtn);

    const quizButtons = screen.getAllByRole("button", { name: "Quiz" });
    // Click the quiz button in the open dropdown
    fireEvent.click(quizButtons[quizButtons.length - 1]);

    expect(onSectionChange).toHaveBeenCalledWith("quiz");
    expect(hamburgerBtn).toHaveAttribute("aria-expanded", "false");
  });

  it("closes mobile menu when Escape key is pressed", () => {
    renderSectionNav("home");

    const hamburgerBtn = screen.getByRole("button", { name: /toggle navigation/i });
    fireEvent.click(hamburgerBtn);
    expect(hamburgerBtn).toHaveAttribute("aria-expanded", "true");

    fireEvent.keyDown(document, { key: "Escape" });
    expect(hamburgerBtn).toHaveAttribute("aria-expanded", "false");
  });

  it("closes mobile menu when backdrop overlay is clicked", () => {
    renderSectionNav("home");

    const hamburgerBtn = screen.getByRole("button", { name: /toggle navigation/i });
    fireEvent.click(hamburgerBtn);

    const overlay = document.querySelector(".mobile-nav-overlay");
    expect(overlay).toBeInTheDocument();

    fireEvent.click(overlay);
    expect(hamburgerBtn).toHaveAttribute("aria-expanded", "false");
    expect(document.querySelector(".mobile-nav-overlay")).not.toBeInTheDocument();
  });
});
