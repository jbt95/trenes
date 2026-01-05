import { type RenfeInsights, fetchRenfeInsights } from "@/lib/insights";
import { RouterProvider, createMemoryHistory, createRouter } from "@tanstack/react-router";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { routeTree } from "../routeTree.gen";

vi.mock("@/lib/insights", () => ({
  fetchRenfeInsights: vi.fn(),
}));

const mockInsights: RenfeInsights = {
  generatedAt: 1_700_000_000,
  totals: {
    vehicles: 5,
    alerts: 2,
    activeAlerts: 1,
    alertsWithMatches: 1,
    vehiclesMatched: 2,
    uniqueRoutes: 3,
    routesWithAlerts: 1,
  },
  alertsByEffect: [{ key: "DELAY", count: 1 }],
  alertsByCause: [{ key: "WEATHER", count: 1 }],
  vehiclesByStatus: [{ key: "ON_TIME", count: 5 }],
  alertsByHour: [{ key: "10", count: 1 }],
  alertDurationDistribution: [{ key: "0-30", count: 1 }],
  routeSummaries: [
    {
      routeId: "R1",
      vehicleCount: 2,
      alertCount: 1,
      activeAlertCount: 1,
      effects: ["DELAY"],
      lastVehicleUpdate: 1_700_000_000,
    },
  ],
  alertTimeline: [
    {
      alertId: "A1",
      header: "Corte de servicio",
      cause: "WEATHER",
      effect: "DELAY",
      start: 1_700_000_000,
      end: null,
      isActiveNow: true,
      durationMinutes: 15,
    },
  ],
  correlations: [
    {
      alertId: "A1",
      header: "Corte de servicio",
      cause: "WEATHER",
      effect: "DELAY",
      start: 1_700_000_000,
      end: null,
      isActiveNow: true,
      matchedVehicleIds: ["V1"],
      matchedTripIds: ["T1"],
      matchedRouteIds: ["R1"],
      matchedVehicleCount: 1,
    },
  ],
};

describe("Frontend App", () => {
  it("renders without crashing", async () => {
    const memoryHistory = createMemoryHistory({
      initialEntries: ["/"],
    });

    const router = createRouter({
      routeTree,
      history: memoryHistory,
    });

    const fetchRenfeInsightsMock = vi.mocked(fetchRenfeInsights);
    fetchRenfeInsightsMock.mockResolvedValue(mockInsights);

    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(fetchRenfeInsightsMock).toHaveBeenCalled();
      expect(
        screen.getByRole("heading", { level: 1, name: /panel de control/i }),
      ).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /trenes/i })).toBeInTheDocument();
    });
  });
});
