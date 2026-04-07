import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import CPButton from "@/components/CPButton";
import CPInput from "@/components/CPInput";
import CPTextarea from "@/components/CPTextarea";
import CPPageHeader from "@/components/CPPageHeader";
import CPModal from "@/components/CPModal";
import { RequireAuth } from "@/components/providers/AuthProvider";
import { Providers } from "@/components/providers/QueryProvider";
import { mockRouter } from "@/test/mocks/nextNavigationMock";

jest.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
}));

describe("base components", () => {
  it("renders CPButton label/children and classes", () => {
    const { rerender } = render(<CPButton label="Save" variant="secondary" size="sm" />);
    const btn = screen.getByRole("button", { name: "Save" });
    expect(btn).toHaveClass("px-3");
    expect(btn).toHaveClass("bg-white");

    rerender(<CPButton label="Save">Child Text</CPButton>);
    expect(screen.getByRole("button", { name: "Child Text" })).toBeInTheDocument();
  });

  it("renders CPInput with unit, description and error states", () => {
    const { rerender } = render(
      <CPInput id="rate" label="Rate" unit="ms" description="Polling interval" />
    );

    expect(screen.getByLabelText("Rate")).toBeInTheDocument();
    expect(screen.getByText("ms")).toBeInTheDocument();
    expect(screen.getByText("Polling interval")).toBeInTheDocument();

    rerender(<CPInput id="rate" label="Rate" error="Invalid value" />);
    expect(screen.getByText("Invalid value")).toBeInTheDocument();
  });

  it("renders CPTextarea with helper and error", () => {
    const { rerender } = render(
      <CPTextarea id="notes" label="Notes" description="Optional" />
    );

    expect(screen.getByLabelText("Notes")).toBeInTheDocument();
    expect(screen.getByText("Optional")).toBeInTheDocument();

    rerender(<CPTextarea id="notes" label="Notes" error="Required" />);
    expect(screen.getByText("Required")).toBeInTheDocument();
  });

  it("renders CPPageHeader subtitle and actions", () => {
    render(
      <CPPageHeader
        title="Overview"
        subtitle="Live summary"
        actions={<button>Refresh</button>}
      />
    );

    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Live summary")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument();
  });

  it("handles CPModal open/close interactions", () => {
    const onClose = jest.fn();

    render(
      <CPModal isOpen={true} onClose={onClose} title="Modal title">
        <div>Modal body</div>
      </CPModal>
    );

    expect(screen.getByText("Modal title")).toBeInTheDocument();
    expect(document.body.style.overflow).toBe("hidden");

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Close modal" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("RequireAuth redirects when no token, renders children when token exists", async () => {
    mockRouter.replace.mockClear();
    localStorage.removeItem("access_token");

    const { unmount } = render(
      <RequireAuth>
        <div>Protected content</div>
      </RequireAuth>
    );

    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/auth/login"));

    unmount();
    localStorage.setItem("access_token", "token");
    render(
      <RequireAuth>
        <div>Protected content</div>
      </RequireAuth>
    );

    await waitFor(() => expect(screen.getByText("Protected content")).toBeInTheDocument());
  });

  it("renders Query provider children", () => {
    render(
      <Providers>
        <div>Inside provider</div>
      </Providers>
    );

    expect(screen.getByText("Inside provider")).toBeInTheDocument();
  });
});
