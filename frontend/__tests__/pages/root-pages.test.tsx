import { render } from "@testing-library/react";
import { redirect } from "next/navigation";

import Home from "@/app/page";
import DashboardPage from "@/app/dashboard/page";
import AuthBackground from "@/app/auth/auth-background";

describe("Home page", () => {
  it("redirects to /dashboard/overview", () => {
    render(<Home />);
    expect(redirect).toHaveBeenCalledWith("/dashboard/overview");
  });
});

describe("Dashboard root page", () => {
  it("redirects to /dashboard/overview", () => {
    render(<DashboardPage />);
    expect(redirect).toHaveBeenCalledWith("/dashboard/overview");
  });
});

describe("AuthBackground", () => {
  it("renders brand and logo", () => {
    const { container } = render(<AuthBackground />);
    expect(container.querySelector("div")).toBeInTheDocument();
  });
});
