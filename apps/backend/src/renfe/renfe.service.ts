import { Injectable } from "@nestjs/common";
import { z } from "zod";

export type RenfeVehiclePositionDto = {
  readonly id: string;
  readonly label: string | null;
  readonly latitude: number;
  readonly longitude: number;
  readonly timestamp: number | null;
  readonly tripId: string | null;
  readonly routeId: string | null;
  readonly currentStatus: string | null;
};

export type RenfeAlertInformedEntityDto = {
  readonly agencyId: string | null;
  readonly routeId: string | null;
  readonly tripId: string | null;
  readonly stopId: string | null;
};

export type RenfeAlertDto = {
  readonly id: string;
  readonly cause: string | null;
  readonly effect: string | null;
  readonly header: string | null;
  readonly description: string | null;
  readonly url: string | null;
  readonly start: number | null;
  readonly end: number | null;
  readonly informedEntities: readonly RenfeAlertInformedEntityDto[];
};

export type RenfeCountByKeyDto = {
  readonly key: string;
  readonly count: number;
};

export type RenfeRouteSummaryDto = {
  readonly routeId: string;
  readonly vehicleCount: number;
  readonly alertCount: number;
  readonly activeAlertCount: number;
  readonly effects: readonly string[];
  readonly lastVehicleUpdate: number | null;
};

export type RenfeAlertTimelineItemDto = {
  readonly alertId: string;
  readonly header: string | null;
  readonly cause: string | null;
  readonly effect: string | null;
  readonly start: number | null;
  readonly end: number | null;
  readonly isActiveNow: boolean;
  readonly durationMinutes: number | null;
};

export type RenfeAlertVehicleCorrelationDto = {
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

export type RenfeInsightsDto = {
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
  readonly alertsByEffect: readonly RenfeCountByKeyDto[];
  readonly alertsByCause: readonly RenfeCountByKeyDto[];
  readonly vehiclesByStatus: readonly RenfeCountByKeyDto[];
  readonly alertsByHour: readonly RenfeCountByKeyDto[];
  readonly alertDurationDistribution: readonly RenfeCountByKeyDto[];
  readonly routeSummaries: readonly RenfeRouteSummaryDto[];
  readonly alertTimeline: readonly RenfeAlertTimelineItemDto[];
  readonly correlations: readonly RenfeAlertVehicleCorrelationDto[];
};

const PositionSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
});

const EntitySchema = z
  .object({
    id: z.string().min(1),
    vehicle: z
      .object({
        position: PositionSchema.optional(),
        timestamp: z.coerce.number().int().nonnegative().optional(),
        currentStatus: z.string().min(1).optional(),
        trip: z
          .object({
            tripId: z.string().min(1).optional(),
            routeId: z.string().min(1).optional(),
          })
          .optional(),
        vehicle: z
          .object({
            id: z.string().min(1).optional(),
            label: z.string().min(1).optional(),
          })
          .optional(),
      })
      .optional(),
  })
  .passthrough();

const FeedSchema = z
  .object({
    entity: z.array(EntitySchema).default([]),
  })
  .passthrough();

const TranslatedTextSchema = z
  .object({
    translation: z
      .array(
        z
          .object({
            text: z.string().optional(),
            language: z.string().optional(),
          })
          .passthrough(),
      )
      .default([]),
  })
  .passthrough();

const AlertActivePeriodSchema = z
  .object({
    start: z.coerce.number().int().nonnegative().optional(),
    end: z.coerce.number().int().nonnegative().optional(),
  })
  .passthrough();

const AlertInformedEntitySchema = z
  .object({
    agencyId: z.string().min(1).optional(),
    routeId: z.string().min(1).optional(),
    stopId: z.string().min(1).optional(),
    trip: z
      .object({
        tripId: z.string().min(1).optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const AlertsEntitySchema = z
  .object({
    id: z.string().min(1),
    alert: z
      .object({
        cause: z.string().min(1).optional(),
        effect: z.string().min(1).optional(),
        headerText: TranslatedTextSchema.optional(),
        descriptionText: TranslatedTextSchema.optional(),
        url: TranslatedTextSchema.optional(),
        activePeriod: z.array(AlertActivePeriodSchema).default([]),
        informedEntity: z.array(AlertInformedEntitySchema).default([]),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const AlertsFeedSchema = z
  .object({
    entity: z.array(AlertsEntitySchema).default([]),
  })
  .passthrough();

const pickTranslatedText = (
  input: z.infer<typeof TranslatedTextSchema> | undefined,
): string | null => {
  if (!input) return null;
  for (const t of input.translation) {
    if (typeof t.text === "string" && t.text.trim().length > 0) return t.text;
  }
  return null;
};

const countByKey = (values: readonly (string | null)[]): RenfeCountByKeyDto[] => {
  const map = new Map<string, number>();
  for (const v of values) {
    const key = v ?? "UNKNOWN";
    map.set(key, (map.get(key) ?? 0) + 1);
  }

  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
};

const isActiveAt = (start: number | null, end: number | null, nowSeconds: number): boolean => {
  const started = start === null || start <= nowSeconds;
  const notEnded = end === null || end >= nowSeconds;
  return started && notEnded;
};

const computeDurationMinutes = (
  start: number | null,
  end: number | null,
  nowSeconds: number,
): number | null => {
  if (start === null) return null;
  const endTime = end ?? nowSeconds;
  const diffSeconds = endTime - start;
  return diffSeconds > 0 ? Math.round(diffSeconds / 60) : null;
};

const getDurationBucket = (minutes: number | null): string => {
  if (minutes === null) return "Unknown";
  if (minutes < 30) return "< 30min";
  if (minutes < 60) return "30-60min";
  if (minutes < 120) return "1-2h";
  if (minutes < 240) return "2-4h";
  if (minutes < 480) return "4-8h";
  return "> 8h";
};

const getHourFromTimestamp = (ts: number | null): string => {
  if (ts === null) return "Unknown";
  const date = new Date(ts * 1000);
  const hour = date.getHours();
  return `${hour.toString().padStart(2, "0")}:00`;
};

@Injectable()
export class RenfeService {
  private static readonly VEHICLE_POSITIONS_URL = "https://gtfsrt.renfe.com/vehicle_positions.json";
  private static readonly ALERTS_URL = "https://gtfsrt.renfe.com/alerts.json";

  async getVehiclePositions(): Promise<readonly RenfeVehiclePositionDto[]> {
    const response = await fetch(RenfeService.VEHICLE_POSITIONS_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch Renfe feed: ${response.status} ${response.statusText}`);
    }

    const json: unknown = await response.json();
    const parsed = FeedSchema.safeParse(json);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid Renfe GTFS-RT JSON";
      throw new Error(message);
    }

    return parsed.data.entity
      .map((entity): RenfeVehiclePositionDto | null => {
        const vehicle = entity.vehicle;
        if (!vehicle?.position) return null;

        return {
          id: vehicle.vehicle?.id ?? entity.id,
          label: vehicle.vehicle?.label ?? null,
          latitude: vehicle.position.latitude,
          longitude: vehicle.position.longitude,
          timestamp: vehicle.timestamp ?? null,
          tripId: vehicle.trip?.tripId ?? null,
          routeId: vehicle.trip?.routeId ?? null,
          currentStatus: vehicle.currentStatus ?? null,
        };
      })
      .filter((v): v is RenfeVehiclePositionDto => v !== null);
  }

  async getAlerts(): Promise<readonly RenfeAlertDto[]> {
    const response = await fetch(RenfeService.ALERTS_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch Renfe alerts: ${response.status} ${response.statusText}`);
    }

    const json: unknown = await response.json();
    const parsed = AlertsFeedSchema.safeParse(json);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid Renfe GTFS-RT alerts JSON";
      throw new Error(message);
    }

    return parsed.data.entity
      .map((entity): RenfeAlertDto | null => {
        const alert = entity.alert;
        if (!alert) return null;

        const firstPeriod = alert.activePeriod[0];
        const informedEntities: RenfeAlertInformedEntityDto[] = alert.informedEntity.map((ie) => ({
          agencyId: ie.agencyId ?? null,
          routeId: ie.routeId ?? null,
          tripId: ie.trip?.tripId ?? null,
          stopId: ie.stopId ?? null,
        }));

        return {
          id: entity.id,
          cause: alert.cause ?? null,
          effect: alert.effect ?? null,
          header: pickTranslatedText(alert.headerText),
          description: pickTranslatedText(alert.descriptionText),
          url: pickTranslatedText(alert.url),
          start: firstPeriod?.start ?? null,
          end: firstPeriod?.end ?? null,
          informedEntities,
        };
      })
      .filter((a): a is RenfeAlertDto => a !== null);
  }

  async getInsights(): Promise<RenfeInsightsDto> {
    const generatedAt = Math.floor(Date.now() / 1000);

    const [vehicles, alerts] = await Promise.all([this.getVehiclePositions(), this.getAlerts()]);

    // Index vehicles by tripId and routeId
    const vehiclesByTripId = new Map<string, Set<string>>();
    const vehiclesByRouteId = new Map<string, Set<string>>();
    const vehicleTimestampsByRoute = new Map<string, number[]>();

    for (const v of vehicles) {
      if (v.tripId) {
        const set = vehiclesByTripId.get(v.tripId) ?? new Set<string>();
        set.add(v.id);
        vehiclesByTripId.set(v.tripId, set);
      }

      if (v.routeId) {
        const set = vehiclesByRouteId.get(v.routeId) ?? new Set<string>();
        set.add(v.id);
        vehiclesByRouteId.set(v.routeId, set);

        if (v.timestamp) {
          const timestamps = vehicleTimestampsByRoute.get(v.routeId) ?? [];
          timestamps.push(v.timestamp);
          vehicleTimestampsByRoute.set(v.routeId, timestamps);
        }
      }
    }

    // Build correlations
    const correlations: RenfeAlertVehicleCorrelationDto[] = alerts.map((a) => {
      const tripIds = new Set<string>();
      const routeIds = new Set<string>();

      for (const ie of a.informedEntities) {
        if (ie.tripId) tripIds.add(ie.tripId);
        if (ie.routeId) routeIds.add(ie.routeId);
      }

      const matchedVehicles = new Set<string>();
      for (const t of tripIds) {
        const set = vehiclesByTripId.get(t);
        if (!set) continue;
        for (const id of set) matchedVehicles.add(id);
      }
      for (const r of routeIds) {
        const set = vehiclesByRouteId.get(r);
        if (!set) continue;
        for (const id of set) matchedVehicles.add(id);
      }

      const matchedVehicleIds = [...matchedVehicles].sort();

      return {
        alertId: a.id,
        header: a.header,
        cause: a.cause,
        effect: a.effect,
        start: a.start,
        end: a.end,
        isActiveNow: isActiveAt(a.start, a.end, generatedAt),
        matchedVehicleIds,
        matchedTripIds: [...tripIds].sort(),
        matchedRouteIds: [...routeIds].sort(),
        matchedVehicleCount: matchedVehicleIds.length,
      };
    });

    const vehiclesMatchedSet = new Set<string>();
    for (const c of correlations) {
      for (const id of c.matchedVehicleIds) vehiclesMatchedSet.add(id);
    }

    const activeAlerts = correlations.filter((c) => c.isActiveNow).length;
    const alertsWithMatches = correlations.filter((c) => c.matchedVehicleCount > 0).length;

    // Build route summaries
    const allRouteIds = new Set<string>();
    for (const v of vehicles) {
      if (v.routeId) allRouteIds.add(v.routeId);
    }
    for (const a of alerts) {
      for (const ie of a.informedEntities) {
        if (ie.routeId) allRouteIds.add(ie.routeId);
      }
    }

    const routeSummaries: RenfeRouteSummaryDto[] = [...allRouteIds]
      .map((routeId) => {
        const routeVehicles = vehiclesByRouteId.get(routeId) ?? new Set<string>();
        const routeAlerts = alerts.filter((a) =>
          a.informedEntities.some((ie) => ie.routeId === routeId),
        );
        const activeRouteAlerts = routeAlerts.filter((a) =>
          isActiveAt(a.start, a.end, generatedAt),
        );
        const effects = [
          ...new Set(routeAlerts.map((a) => a.effect).filter((e): e is string => e !== null)),
        ];
        const timestamps = vehicleTimestampsByRoute.get(routeId) ?? [];
        const lastVehicleUpdate = timestamps.length > 0 ? Math.max(...timestamps) : null;

        return {
          routeId,
          vehicleCount: routeVehicles.size,
          alertCount: routeAlerts.length,
          activeAlertCount: activeRouteAlerts.length,
          effects,
          lastVehicleUpdate,
        };
      })
      .sort((a, b) => b.alertCount - a.alertCount);

    const routesWithAlerts = routeSummaries.filter((r) => r.alertCount > 0).length;

    // Build alert timeline
    const alertTimeline: RenfeAlertTimelineItemDto[] = alerts
      .map((a) => ({
        alertId: a.id,
        header: a.header,
        cause: a.cause,
        effect: a.effect,
        start: a.start,
        end: a.end,
        isActiveNow: isActiveAt(a.start, a.end, generatedAt),
        durationMinutes: computeDurationMinutes(a.start, a.end, generatedAt),
      }))
      .sort((a, b) => (b.start ?? 0) - (a.start ?? 0));

    // Alerts by hour (start time)
    const alertsByHour = countByKey(alerts.map((a) => getHourFromTimestamp(a.start)));

    // Duration distribution
    const durations = alerts.map((a) => computeDurationMinutes(a.start, a.end, generatedAt));
    const alertDurationDistribution = countByKey(durations.map(getDurationBucket));

    return {
      generatedAt,
      totals: {
        vehicles: vehicles.length,
        alerts: alerts.length,
        activeAlerts,
        alertsWithMatches,
        vehiclesMatched: vehiclesMatchedSet.size,
        uniqueRoutes: allRouteIds.size,
        routesWithAlerts,
      },
      alertsByEffect: countByKey(alerts.map((a) => a.effect)),
      alertsByCause: countByKey(alerts.map((a) => a.cause)),
      vehiclesByStatus: countByKey(vehicles.map((v) => v.currentStatus)),
      alertsByHour,
      alertDurationDistribution,
      routeSummaries,
      alertTimeline,
      correlations: correlations.sort((a, b) => b.matchedVehicleCount - a.matchedVehicleCount),
    };
  }
}
