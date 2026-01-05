import { apiFetch } from "./api";

export type CountByKey = {
  readonly key: string;
  readonly count: number;
};

export type RouteSummary = {
  readonly routeId: string;
  readonly vehicleCount: number;
  readonly alertCount: number;
  readonly activeAlertCount: number;
  readonly effects: readonly string[];
  readonly lastVehicleUpdate: number | null;
};

export type AlertTimelineItem = {
  readonly alertId: string;
  readonly header: string | null;
  readonly cause: string | null;
  readonly effect: string | null;
  readonly start: number | null;
  readonly end: number | null;
  readonly isActiveNow: boolean;
  readonly durationMinutes: number | null;
};

export type AlertVehicleCorrelation = {
  readonly alertId: string;
  readonly header: string | null;
  readonly cause: string | null;
  readonly effect: string | null;
  readonly start: number | null;
  readonly end: number | null;
  readonly isActiveNow: boolean;
  readonly matchedVehicleIds: readonly string[];
  readonly matchedTripIds: readonly string[];
  readonly matchedRouteIds: readonly string[];
  readonly matchedVehicleCount: number;
};

export type RenfeInsights = {
  readonly generatedAt: number;
  readonly totals: {
    readonly vehicles: number;
    readonly alerts: number;
    readonly activeAlerts: number;
    readonly alertsWithMatches: number;
    readonly vehiclesMatched: number;
    readonly uniqueRoutes: number;
    readonly routesWithAlerts: number;
  };
  readonly alertsByEffect: readonly CountByKey[];
  readonly alertsByCause: readonly CountByKey[];
  readonly vehiclesByStatus: readonly CountByKey[];
  readonly alertsByHour: readonly CountByKey[];
  readonly alertDurationDistribution: readonly CountByKey[];
  readonly routeSummaries: readonly RouteSummary[];
  readonly alertTimeline: readonly AlertTimelineItem[];
  readonly correlations: readonly AlertVehicleCorrelation[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isCountByKey = (value: unknown): value is CountByKey =>
  isRecord(value) && typeof value.key === "string" && typeof value.count === "number";

const isCorrelation = (value: unknown): value is AlertVehicleCorrelation => {
  if (!isRecord(value)) return false;
  if (typeof value.alertId !== "string") return false;
  if (typeof value.isActiveNow !== "boolean") return false;
  if (typeof value.matchedVehicleCount !== "number") return false;
  if (!Array.isArray(value.matchedVehicleIds)) return false;
  if (!Array.isArray(value.matchedTripIds)) return false;
  if (!Array.isArray(value.matchedRouteIds)) return false;

  return true;
};

export const fetchRenfeInsights = async (signal?: AbortSignal): Promise<RenfeInsights> => {
  const response = await apiFetch("/renfe/insights", { method: "GET", signal });
  if (!response.ok) {
    throw new Error(`Failed to fetch Renfe insights: ${response.status} ${response.statusText}`);
  }

  const data: unknown = await response.json();
  if (!isRecord(data)) throw new Error("Invalid response: expected object");

  if (!isRecord(data.totals)) throw new Error("Invalid response: missing totals");

  if (!Array.isArray(data.alertsByEffect) || !data.alertsByEffect.every(isCountByKey)) {
    throw new Error("Invalid response: alertsByEffect");
  }
  if (!Array.isArray(data.alertsByCause) || !data.alertsByCause.every(isCountByKey)) {
    throw new Error("Invalid response: alertsByCause");
  }
  if (!Array.isArray(data.vehiclesByStatus) || !data.vehiclesByStatus.every(isCountByKey)) {
    throw new Error("Invalid response: vehiclesByStatus");
  }
  if (!Array.isArray(data.correlations) || !data.correlations.every(isCorrelation)) {
    throw new Error("Invalid response: correlations");
  }

  return data as RenfeInsights;
};
