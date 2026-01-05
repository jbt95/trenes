import { apiFetch } from "./api";

export type VehiclePosition = {
  readonly id: string;
  readonly label: string | null;
  readonly latitude: number;
  readonly longitude: number;
  readonly timestamp: number | null;
  readonly tripId: string | null;
  readonly routeId: string | null;
  readonly currentStatus: string | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isStringOrNull = (value: unknown): value is string | null =>
  value === null || typeof value === "string";

const isVehiclePosition = (value: unknown): value is VehiclePosition => {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === "string" &&
    isStringOrNull(value.label) &&
    isNumber(value.latitude) &&
    isNumber(value.longitude) &&
    (value.timestamp === null ||
      (typeof value.timestamp === "number" && Number.isFinite(value.timestamp))) &&
    isStringOrNull(value.tripId) &&
    isStringOrNull(value.routeId) &&
    isStringOrNull(value.currentStatus)
  );
};

export const fetchRenfeVehiclePositions = async (
  signal?: AbortSignal,
): Promise<readonly VehiclePosition[]> => {
  const response = await apiFetch("/renfe/vehicle-positions", {
    method: "GET",
    signal,
  });
  if (!response.ok) {
    throw new Error(
      `Failed to fetch Renfe vehicle positions: ${response.status} ${response.statusText}`,
    );
  }

  const data: unknown = await response.json();
  if (!Array.isArray(data)) {
    throw new Error("Invalid response: expected array");
  }

  return data.filter(isVehiclePosition);
};
