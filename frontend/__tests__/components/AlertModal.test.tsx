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
  useCreateAlert: jest.fn(),
  useUpdateAlert: jest.fn(),
  useDeleteAlert: jest.fn(),
  useDeleteAlertEvents: jest.fn(),
  useRetrieveAlert: jest.fn(),
}));

jest.mock("@/components/ConditionQueryBuilder", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: ({ query, onChange }: any) =>
      React.createElement("div", { "data-testid": "condition-query-builder" }),
    defaultQuery: { combinator: "and", rules: [] },
    queryToJsonLogic: jest.fn(() => ({
      and: [
        { "==": [{ var: "behavior" }, "walking"] },
        { ">": [{ var: "duration" }, 30] },
      ],
    })),
    jsonLogicToQuery: jest.fn(() => ({ combinator: "and", rules: [] })),
  };
});

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AlertModal from "@/components/modal/AlertModal";
import {
  useCreateAlert,
  useUpdateAlert,
  useDeleteAlert,
  useDeleteAlertEvents,
  useRetrieveAlert,
} from "@/hooks/alert";

const baseMutation = () => ({
  mutate: jest.fn(),
  mutateAsync: jest.fn().mockResolvedValue({}),
  isPending: false,
  isError: false,
  isSuccess: false,
  data: undefined,
});

function setupMocks(overrides: Record<string, any> = {}) {
  (useCreateAlert as jest.Mock).mockReturnValue(
    overrides.create ?? baseMutation()
  );
  (useUpdateAlert as jest.Mock).mockReturnValue(
    overrides.update ?? baseMutation()
  );
  (useDeleteAlert as jest.Mock).mockReturnValue(
    overrides.delete ?? baseMutation()
  );
  (useDeleteAlertEvents as jest.Mock).mockReturnValue(
    overrides.deleteEvents ?? baseMutation()
  );
  (useRetrieveAlert as jest.Mock).mockReturnValue(
    overrides.retrieve ?? { data: null, isLoading: false }
  );
}

describe("AlertModal", () => {
  beforeEach(() => {
    setupMocks();
  });

  it("does not render when closed", () => {
    const { container } = render(
      <AlertModal isOpen={false} onClose={jest.fn()} />
    );
    expect(container.querySelector("form")).not.toBeInTheDocument();
  });

  it("renders create form when open with no alert", () => {
    render(<AlertModal isOpen={true} onClose={jest.fn()} />);
    expect(screen.getByText("Create New Alert")).toBeInTheDocument();
    expect(screen.getByText("Create Alert")).toBeInTheDocument();
    expect(screen.getByTestId("condition-query-builder")).toBeInTheDocument();
  });

  it("renders edit form when alert is provided", () => {
    const alert = {
      id: 1,
      name: "Test Alert",
      description: "Test desc",
      is_active: true,
      conditions: {},
      actions: { email: "test@example.com" },
      last_modified_at: "2026-01-01",
    };
    render(<AlertModal isOpen={true} onClose={jest.fn()} alert={alert as any} />);
    expect(screen.getByText("Edit Alert")).toBeInTheDocument();
    expect(screen.getByText("Save Changes")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("shows tabs in edit mode", () => {
    const alert = { id: 1, name: "A", conditions: {}, actions: {} };
    render(<AlertModal isOpen={true} onClose={jest.fn()} alert={alert as any} />);
    expect(screen.getByText("Form")).toBeInTheDocument();
    expect(screen.getByText("Alert History")).toBeInTheDocument();
  });

  it("switches to history tab", () => {
    const alert = { id: 1, name: "A", conditions: {}, actions: {} };
    render(<AlertModal isOpen={true} onClose={jest.fn()} alert={alert as any} />);
    fireEvent.click(screen.getByText("Alert History"));
    expect(screen.getByText("Triggered Events")).toBeInTheDocument();
    expect(screen.getByText("No alert events have been triggered yet.")).toBeInTheDocument();
  });

  it("shows events in history tab", () => {
    const alert = { id: 1, name: "A", conditions: {}, actions: {} };
    const events = [
      {
        id: 101,
        triggered_at: "2026-01-15T10:00:00Z",
        details: { behavior: "walking", cow_id: "cow-1", duration_seconds: 45 },
      },
    ];
    setupMocks({
      retrieve: { data: { ...alert, events }, isLoading: false },
    });
    render(<AlertModal isOpen={true} onClose={jest.fn()} alert={alert as any} />);
    fireEvent.click(screen.getByText("Alert History"));
    expect(screen.getByText("walking")).toBeInTheDocument();
    expect(screen.getByText("Delete All")).toBeInTheDocument();
  });

  it("shows loading skeletons in history tab", () => {
    const alert = { id: 1, name: "A", conditions: {}, actions: {} };
    setupMocks({ retrieve: { data: null, isLoading: true } });
    render(<AlertModal isOpen={true} onClose={jest.fn()} alert={alert as any} />);
    fireEvent.click(screen.getByText("Alert History"));
    // Skeleton renders spans
    expect(screen.queryByText("No alert events have been triggered yet.")).not.toBeInTheDocument();
  });

  it("toggles email notification", () => {
    render(<AlertModal isOpen={true} onClose={jest.fn()} />);
    const toggle = screen.getByRole("switch");
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(toggle);
    // Re-query after state change
    const updatedToggle = screen.getByRole("switch");
    expect(updatedToggle.getAttribute("aria-checked")).toBe("true");
    expect(screen.getByPlaceholderText("alerts@example.com")).toBeInTheDocument();
  });

  it("submits create form", async () => {
    const createAsync = jest.fn().mockResolvedValue({});
    const onClose = jest.fn();
    setupMocks({ create: { ...baseMutation(), mutateAsync: createAsync } });
    render(<AlertModal isOpen={true} onClose={onClose} />);

    fireEvent.change(screen.getByPlaceholderText("e.g., Low feeding activity"), {
      target: { value: "My Alert" },
    });
    fireEvent.click(screen.getByText("Create Alert"));

    await waitFor(() => {
      expect(createAsync).toHaveBeenCalled();
    });
  });

  it("deletes an alert", async () => {
    const deleteAsync = jest.fn().mockResolvedValue({});
    const onClose = jest.fn();
    jest.spyOn(window, "confirm").mockReturnValue(true);

    setupMocks({ delete: { ...baseMutation(), mutateAsync: deleteAsync } });
    const alert = { id: 5, name: "Del", conditions: {}, actions: {} };
    render(<AlertModal isOpen={true} onClose={onClose} alert={alert as any} />);

    fireEvent.click(screen.getByText("Delete"));

    await waitFor(() => {
      expect(deleteAsync).toHaveBeenCalledWith(5);
    });
  });

  it("expands event details", () => {
    const alert = { id: 1, name: "A", conditions: {}, actions: {} };
    const events = [
      {
        id: 101,
        triggered_at: "2026-01-15T10:00:00Z",
        details: { behavior: "walking", cow_id: "cow-1", duration_seconds: 45 },
      },
    ];
    setupMocks({
      retrieve: { data: { ...alert, events }, isLoading: false },
    });
    render(<AlertModal isOpen={true} onClose={jest.fn()} alert={alert as any} />);
    fireEvent.click(screen.getByText("Alert History"));

    // Click on the event entry to expand it
    const eventButton = screen.getByText("walking").closest("button")!;
    fireEvent.click(eventButton);

    expect(screen.getByText("cow-1")).toBeInTheDocument();
    expect(screen.getByText("45s")).toBeInTheDocument();
  });
});
