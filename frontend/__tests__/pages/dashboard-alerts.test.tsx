jest.mock("@/api/client", () => {
  const { z } = require("zod");
  return {
    api: {},
    schemas: {
      AlertRule: z.object({ id: z.number() }),
      AlertEvent: z.object({ id: z.number() }),
      AlertRuleWriteRequest: z.object({
        name: z.string(),
        description: z.string().optional(),
        conditions: z.any(),
        actions: z.string(),
        is_active: z.boolean(),
      }),
    },
  };
});

jest.mock("@/hooks/alert", () => ({
  useAlertsList: jest.fn(),
  useCreateAlert: jest.fn(() => ({ mutateAsync: jest.fn(), isPending: false })),
  useUpdateAlert: jest.fn(() => ({ mutateAsync: jest.fn(), isPending: false })),
  useDeleteAlert: jest.fn(() => ({ mutateAsync: jest.fn(), isPending: false })),
  useDeleteAlertEvents: jest.fn(() => ({
    mutateAsync: jest.fn(),
    isPending: false,
  })),
  useRetrieveAlert: jest.fn(() => ({ data: null, isLoading: false })),
}));

jest.mock("@/components/ConditionQueryBuilder", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: () => React.createElement("div", { "data-testid": "cqb" }),
    defaultQuery: { combinator: "and", rules: [] },
    queryToJsonLogic: jest.fn(() => null),
    jsonLogicToQuery: jest.fn(() => ({ combinator: "and", rules: [] })),
  };
});

import { render, screen, fireEvent } from "@testing-library/react";
import AlertsPage from "@/app/dashboard/alerts/page";
import { useAlertsList } from "@/hooks/alert";

describe("AlertsPage", () => {
  it("renders loading state", () => {
    (useAlertsList as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    });
    render(<AlertsPage />);
    // Skeleton loaders should appear
    expect(screen.queryByText("No Alerts Yet")).not.toBeInTheDocument();
  });

  it("renders empty state", () => {
    (useAlertsList as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    });
    render(<AlertsPage />);
    expect(screen.getByText("No Alerts Yet")).toBeInTheDocument();
    expect(
      screen.getByText(/Create a alert to get notified/)
    ).toBeInTheDocument();
  });

  it("renders error state", () => {
    (useAlertsList as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("fail"),
    });
    render(<AlertsPage />);
    expect(screen.getByText("Error loading alerts.")).toBeInTheDocument();
  });

  it("renders alerts table", () => {
    const alerts = [
      {
        id: 1,
        name: "Alert One",
        description: "desc 1",
        is_active: true,
        last_modified_at: "2026-04-01",
      },
      {
        id: 2,
        name: "Alert Two",
        description: "",
        is_active: false,
        last_modified_at: null,
      },
    ];
    (useAlertsList as jest.Mock).mockReturnValue({
      data: alerts,
      isLoading: false,
      isError: false,
      error: null,
    });
    render(<AlertsPage />);
    expect(screen.getByText("Alerts")).toBeInTheDocument();
    expect(screen.getByText("Alert One")).toBeInTheDocument();
    expect(screen.getByText("Alert Two")).toBeInTheDocument();
    expect(screen.getByText("Enabled")).toBeInTheDocument();
    expect(screen.getByText("Disabled")).toBeInTheDocument();
  });

  it("opens new alert modal via button", () => {
    (useAlertsList as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    });
    render(<AlertsPage />);
    const buttons = screen.getAllByText("New Alert");
    fireEvent.click(buttons[0]);
    // The router.push is called, it's mocked
  });
});
