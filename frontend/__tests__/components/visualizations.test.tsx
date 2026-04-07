import { render, screen } from "@testing-library/react";
import CPCowStateTimeline from "@/components/visualizations/CPCowBehaviorChart";
import CPDoughnutPlot from "@/components/visualizations/CPDoughnutPlot";
import CPStackAreaPlot from "@/components/visualizations/CPStackAreaPlot";

describe("CPCowStateTimeline", () => {
  it("renders with empty tracks", () => {
    render(<CPCowStateTimeline tracks={[]} cowId="cow-1" />);
    expect(screen.getByTestId("echarts")).toBeInTheDocument();
  });

  it("renders with no matching cow", () => {
    const tracks = [
      { cow_id: "cow-2", timestamp: 1000, behavior: "walking" },
    ];
    render(<CPCowStateTimeline tracks={tracks as any} cowId="cow-1" />);
    expect(screen.getByTestId("echarts")).toBeInTheDocument();
  });

  it("renders timeline with valid tracks and segments", () => {
    const tracks = [
      { cow_id: "cow-1", timestamp: 1000, behavior: "walking" },
      { cow_id: "cow-1", timestamp: 1000, behavior: "walking" },
      { cow_id: "cow-1", timestamp: 2000, behavior: "walking" },
      { cow_id: "cow-1", timestamp: 3000, behavior: "lying" },
      { cow_id: "cow-1", timestamp: 4000, behavior: "lying" },
      { cow_id: "cow-1", timestamp: 5000, behavior: "feeding_head_down" },
      { cow_id: "cow-2", timestamp: 1000, behavior: "standing" },
    ];
    render(<CPCowStateTimeline tracks={tracks as any} cowId="cow-1" />);
    expect(screen.getByTestId("echarts")).toBeInTheDocument();
  });

  it("handles loading state", () => {
    render(<CPCowStateTimeline tracks={[]} cowId="cow-1" loading />);
    expect(screen.getByTestId("echarts")).toBeInTheDocument();
  });

  it("handles empty cowId", () => {
    render(<CPCowStateTimeline tracks={[]} cowId="" />);
    expect(screen.getByTestId("echarts")).toBeInTheDocument();
  });
});

describe("CPDoughnutPlot", () => {
  it("renders with data", () => {
    const data = [
      { name: "Feeding", value: 30 },
      { name: "Resting", value: 50 },
      { name: "Walking/Standing", value: 20 },
    ];
    render(<CPDoughnutPlot data={data} />);
    expect(screen.getByTestId("echarts")).toBeInTheDocument();
  });

  it("renders with empty data", () => {
    render(<CPDoughnutPlot data={[]} />);
    expect(screen.getByTestId("echarts")).toBeInTheDocument();
  });

  it("handles loading state", () => {
    render(<CPDoughnutPlot data={[]} loading />);
    expect(screen.getByTestId("echarts")).toBeInTheDocument();
  });
});

describe("CPStackAreaPlot", () => {
  it("renders with data", () => {
    const timeData = ["10:00", "10:01", "10:02"];
    const seriesData = [
      { name: "Feeding", data: [10, 20, 15] },
      { name: "Resting", data: [5, 10, 8] },
    ];
    render(<CPStackAreaPlot timeData={timeData} seriesData={seriesData} />);
    expect(screen.getByTestId("echarts")).toBeInTheDocument();
  });

  it("renders with empty data", () => {
    render(<CPStackAreaPlot timeData={[]} seriesData={[]} />);
    expect(screen.getByTestId("echarts")).toBeInTheDocument();
  });

  it("handles loading state", () => {
    render(<CPStackAreaPlot timeData={[]} seriesData={[]} loading />);
    expect(screen.getByTestId("echarts")).toBeInTheDocument();
  });
});
