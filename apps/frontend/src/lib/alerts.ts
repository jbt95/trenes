import { apiFetch } from "./api";

export type AlertInformedEntity = {
  readonly agencyId: string | null;
  readonly routeId: string | null;
  readonly tripId: string | null;
  readonly stopId: string | null;
};

export type RenfeAlert = {
  readonly id: string;
  readonly cause: string | null;
  readonly effect: string | null;
  readonly header: string | null;
  readonly description: string | null;
  readonly url: string | null;
  readonly start: number | null;
  readonly end: number | null;
  readonly informedEntities: readonly AlertInformedEntity[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isStringOrNull = (value: unknown): value is string | null =>
  value === null || typeof value === "string";

const isNumberOrNull = (value: unknown): value is number | null =>
  value === null || (typeof value === "number" && Number.isFinite(value));

const isInformedEntity = (value: unknown): value is AlertInformedEntity => {
  if (!isRecord(value)) return false;
  return (
    isStringOrNull(value.agencyId) &&
    isStringOrNull(value.routeId) &&
    isStringOrNull(value.tripId) &&
    isStringOrNull(value.stopId)
  );
};

const isAlert = (value: unknown): value is RenfeAlert => {
  if (!isRecord(value)) return false;
  if (typeof value.id !== "string") return false;

  return (
    isStringOrNull(value.cause) &&
    isStringOrNull(value.effect) &&
    isStringOrNull(value.header) &&
    isStringOrNull(value.description) &&
    isStringOrNull(value.url) &&
    isNumberOrNull(value.start) &&
    isNumberOrNull(value.end) &&
    Array.isArray(value.informedEntities) &&
    value.informedEntities.every(isInformedEntity)
  );
};

export const fetchRenfeAlerts = async (
  signal?: AbortSignal
): Promise<readonly RenfeAlert[]> => {
  const response = await apiFetch("/renfe/alerts", { method: "GET", signal });
  if (!response.ok) {
    throw new Error(
      `Failed to fetch Renfe alerts: ${response.status} ${response.statusText}`
    );
  }

  const data: unknown = await response.json();
  if (!Array.isArray(data)) {
    throw new Error("Invalid response: expected array");
  }

  return data.filter(isAlert);
};
