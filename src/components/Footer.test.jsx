import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Footer from "./Footer";

describe("Footer", () => {
  it("renders the footer content", () => {
    render(<Footer />);

    // Check project title
    expect(screen.getByText("Pollution Control Hub")).toBeInTheDocument();

    // Check navigation links
    expect(
      screen.getByRole("link", { name: /GitHub Repository/i })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: /Report an Issue/i })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: /Contributing Guide/i })
    ).toBeInTheDocument();

    // Check dynamic copyright year
    const year = new Date().getFullYear();
    expect(
      screen.getByText(new RegExp(`©\\s*${year}\\s*Pollution Control Hub\\.`))
    ).toBeInTheDocument();
  });
});