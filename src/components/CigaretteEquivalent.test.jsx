import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CigaretteEquivalent from "./CigaretteEquivalent";

describe("CigaretteEquivalent", () => {
  it("renders the equivalent for a polluted AQI", () => {
    render(<CigaretteEquivalent aqi={100} />);
    expect(screen.getByTestId("cigarette-equivalent")).toBeInTheDocument();
    expect(screen.getByText("1.6")).toBeInTheDocument();
  });

  it("accepts a raw pm25 value", () => {
    render(<CigaretteEquivalent pm25={22} />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText(/cigarette\/day/)).toBeInTheDocument();
  });

  it("renders nothing for clean air (AQI 0)", () => {
    const { container } = render(<CigaretteEquivalent aqi={0} />);
    expect(container).toBeEmptyDOMElement();
  });
});
