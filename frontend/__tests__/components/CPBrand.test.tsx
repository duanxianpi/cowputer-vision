import { render, screen } from "@testing-library/react";
import CPBrand from "@/components/CPBrand";
import CPLogo from "@/components/CPLogo";

describe("CPBrand", () => {
  it("renders COW and PUTER text", () => {
    render(<CPBrand />);
    expect(screen.getByText("COW")).toBeInTheDocument();
    expect(screen.getByText("PUTER")).toBeInTheDocument();
  });

  it("applies white variant class", () => {
    render(<CPBrand whiteVariant />);
    const cow = screen.getByText("COW");
    expect(cow.className).toContain("text-white");
  });

  it("applies default text class when no textClassName", () => {
    const { container } = render(<CPBrand />);
    expect(container.firstChild).toHaveClass("text-2xl");
  });

  it("uses custom textClassName", () => {
    const { container } = render(<CPBrand textClassName="text-4xl" />);
    expect(container.firstChild).toHaveClass("text-4xl");
    expect(container.firstChild).not.toHaveClass("text-2xl");
  });

  it("applies black text when not white variant", () => {
    render(<CPBrand />);
    const cow = screen.getByText("COW");
    expect(cow.className).toContain("text-black");
  });
});

describe("CPLogo", () => {
  it("renders an image with alt text", () => {
    render(<CPLogo />);
    expect(screen.getByAltText("Cowputer Logo")).toBeInTheDocument();
  });
});
