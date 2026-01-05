import { createFileRoute } from "@tanstack/react-router";
import React from "react";
import {
  fetchRenfeVehiclePositions,
  type VehiclePosition,
} from "@/lib/vehicles";
import { fetchRenfeInsights, type RenfeInsights } from "@/lib/insights";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CircleMarker, MapContainer, TileLayer, Tooltip } from "react-leaflet";
import type { LatLngBoundsExpression } from "leaflet";

export const Route = createFileRoute("/vehicles")({
  component: Vehicles,
});

type LoadState =
  | { readonly kind: "loading" }
  | { readonly kind: "error"; readonly message: string }
  | {
      readonly kind: "loaded";
      readonly positions: readonly VehiclePosition[];
      readonly insights: RenfeInsights | null;
    };

/** Color palette for different routes */
const ROUTE_COLORS = [
  "#3b82f6", // blue
  "#22c55e", // green
  "#f97316", // orange
  "#ef4444", // red
  "#8b5cf6", // purple
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#eab308", // yellow
  "#14b8a6", // teal
  "#f43f5e", // rose
  "#6366f1", // indigo
  "#84cc16", // lime
  "#a855f7", // violet
  "#0ea5e9", // sky
  "#10b981", // emerald
  "#f59e0b", // amber
];

/** Generate a consistent color for a route ID */
const getRouteColor = (
  routeId: string | null,
  routeColorMap: Map<string, string>
): string => {
  if (!routeId) return "#6b7280"; // gray for unknown routes

  const existing = routeColorMap.get(routeId);
  if (existing) return existing;

  // Hash the route ID to get a consistent index
  let hash = 0;
  for (let i = 0; i < routeId.length; i++) {
    const char = routeId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return ROUTE_COLORS[Math.abs(hash) % ROUTE_COLORS.length] ?? ROUTE_COLORS[0];
};

/** Build a map of route IDs to colors */
const buildRouteColorMap = (
  positions: readonly VehiclePosition[]
): Map<string, string> => {
  const routeIds = [
    ...new Set(
      positions.map((p) => p.routeId).filter((id): id is string => id !== null)
    ),
  ];
  routeIds.sort();

  const map = new Map<string, string>();
  routeIds.forEach((routeId, index) => {
    map.set(
      routeId,
      ROUTE_COLORS[index % ROUTE_COLORS.length] ?? ROUTE_COLORS[0]
    );
  });

  return map;
};

/** Set of vehicle IDs that are affected by at least one alert */
const buildAffectedVehicleIds = (
  insights: RenfeInsights | null
): Set<string> => {
  if (!insights) return new Set();
  const ids = new Set<string>();
  for (const corr of insights.correlations) {
    for (const vid of corr.matchedVehicleIds) {
      ids.add(vid);
    }
  }
  return ids;
};

/** Map vehicle ID -> list of alert headers affecting it */
const buildVehicleAlertMap = (
  insights: RenfeInsights | null
): Map<string, string[]> => {
  if (!insights) return new Map();
  const map = new Map<string, string[]>();
  for (const corr of insights.correlations) {
    const label = corr.header ?? corr.alertId;
    for (const vid of corr.matchedVehicleIds) {
      const existing = map.get(vid);
      if (existing) {
        existing.push(label);
      } else {
        map.set(vid, [label]);
      }
    }
  }
  return map;
};

const extent = (
  values: readonly number[]
): { readonly min: number; readonly max: number } => {
  if (values.length === 0) return { min: 0, max: 0 };
  const first = values[0];
  if (first === undefined) return { min: 0, max: 0 };

  return values.reduce(
    (acc, v) => ({ min: Math.min(acc.min, v), max: Math.max(acc.max, v) }),
    { min: first, max: first }
  );
};

const formatTimestamp = (ts: number | null): string => {
  if (ts === null) return "—";
  const date = new Date(ts * 1000);
  return Number.isNaN(date.getTime()) ? String(ts) : date.toLocaleString();
};

function Vehicles() {
  const [state, setState] = React.useState<LoadState>({ kind: "loading" });
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [showAffectedOnly, setShowAffectedOnly] = React.useState(false);

  const reload = React.useCallback(async (signal?: AbortSignal) => {
    const [positions, insights] = await Promise.all([
      fetchRenfeVehiclePositions(signal),
      fetchRenfeInsights(signal).catch(() => null),
    ]);
    setState({ kind: "loaded", positions, insights });
    setSelectedId((prev) =>
      prev && positions.some((p) => p.id === prev) ? prev : null
    );
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();

    void (async () => {
      try {
        await reload(controller.signal);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setState({ kind: "error", message });
      }
    })();

    return () => controller.abort();
  }, [reload]);

  const onRefresh = async (): Promise<void> => {
    try {
      setState({ kind: "loading" });
      await reload();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setState({ kind: "error", message });
    }
  };

  // Extract data from state (null/empty when not loaded)
  const positions = state.kind === "loaded" ? state.positions : [];
  const insights = state.kind === "loaded" ? state.insights : null;

  // Hooks must be called unconditionally (before early returns)
  const affectedIds = React.useMemo(
    () => buildAffectedVehicleIds(insights),
    [insights]
  );
  const vehicleAlertMap = React.useMemo(
    () => buildVehicleAlertMap(insights),
    [insights]
  );
  const routeColorMap = React.useMemo(
    () => buildRouteColorMap(positions),
    [positions]
  );

  if (state.kind === "loading") {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-bold">Vehículos Renfe</h1>
          <Button variant="outline" onClick={() => void onRefresh()}>
            Actualizar
          </Button>
        </div>
        <p className="text-muted-foreground">
          Cargando posiciones de vehículos…
        </p>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="space-y-3">
        <h1 className="text-3xl font-bold">Vehículos Renfe</h1>
        <p className="text-destructive">{state.message}</p>
        <p className="text-muted-foreground">
          Consejo: asegúrate de que el backend esté ejecutándose y que{" "}
          <span className="font-mono">VITE_API_URL</span> apunte a él.
        </p>
      </div>
    );
  }

  const selected = positions.find((p) => p.id === selectedId) ?? null;

  const displayedPositions = showAffectedOnly
    ? positions.filter((p) => affectedIds.has(p.id))
    : positions;

  const lats = displayedPositions.map((p) => p.latitude);
  const lngs = displayedPositions.map((p) => p.longitude);
  const latExt = extent(lats);
  const lngExt = extent(lngs);

  const bounds: LatLngBoundsExpression | undefined =
    displayedPositions.length >= 2
      ? [
          [latExt.min, lngExt.min],
          [latExt.max, lngExt.max],
        ]
      : undefined;

  const mapCenter: [number, number] = displayedPositions.length
    ? [
        displayedPositions[0]?.latitude ?? 40.4168,
        displayedPositions[0]?.longitude ?? -3.7038,
      ]
    : [40.4168, -3.7038];

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Vehículos Renfe</h1>
          <p className="text-sm text-muted-foreground">
            {positions.length} vehículos · {affectedIds.size} afectados por
            alertas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showAffectedOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setShowAffectedOnly(!showAffectedOnly)}
          >
            {showAffectedOnly ? "Mostrar todos" : "Solo afectados"}
          </Button>
          <Button variant="outline" onClick={() => void onRefresh()}>
            Actualizar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Lista</CardTitle>
            <CardDescription>
              Haz clic en un elemento para resaltarlo en el mapa. Los colores
              representan diferentes rutas. Borde rojo = afectado por alerta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[460px]">
              <ul className="divide-y">
                {displayedPositions.map((p) => {
                  const isSelected = p.id === selectedId;
                  const isAffected = affectedIds.has(p.id);
                  const alertLabels = vehicleAlertMap.get(p.id) ?? [];
                  const title = p.label ?? p.id;
                  const routeColor = getRouteColor(p.routeId, routeColorMap);

                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(p.id)}
                        className={`w-full rounded-md px-3 py-3 text-left transition-colors hover:bg-accent ${
                          isSelected ? "bg-accent" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 truncate font-medium">
                              <span style={{ color: routeColor }}>●</span>
                              {isAffected && (
                                <span className="text-red-600 text-xs">
                                  (⚠)
                                </span>
                              )}
                              {title}
                            </div>
                            <div className="truncate text-sm text-muted-foreground">
                              {p.currentStatus ?? "—"} ·{" "}
                              {formatTimestamp(p.timestamp)}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">
                              trip: {p.tripId ?? "—"} · route:{" "}
                              <span style={{ color: routeColor }}>
                                {p.routeId ?? "—"}
                              </span>
                            </div>
                            {alertLabels.length > 0 && (
                              <div
                                className="mt-1 truncate text-xs text-red-600"
                                title={alertLabels.join(" · ")}
                              >
                                ⚠ {alertLabels.slice(0, 2).join(" · ")}
                                {alertLabels.length > 2
                                  ? ` +${alertLabels.length - 2}`
                                  : ""}
                              </div>
                            )}
                          </div>
                          <div className="shrink-0 text-xs text-muted-foreground">
                            {p.latitude.toFixed(3)}, {p.longitude.toFixed(3)}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mapa</CardTitle>
            <CardDescription>
              {selected
                ? `Seleccionado: ${selected.label ?? selected.id}`
                : "Selecciona un vehículo para resaltarlo."}{" "}
              Colores = rutas · Borde rojo = alerta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[520px] w-full overflow-hidden rounded-lg border">
              <MapContainer
                center={mapCenter}
                zoom={displayedPositions.length >= 2 ? 7 : 8}
                bounds={bounds}
                boundsOptions={{ padding: [24, 24] }}
                scrollWheelZoom
                className="h-full w-full"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {displayedPositions.map((p) => {
                  const isSelected = p.id === selectedId;
                  const isAffected = affectedIds.has(p.id);
                  const alertLabels = vehicleAlertMap.get(p.id) ?? [];
                  const routeColor = getRouteColor(p.routeId, routeColorMap);

                  // Use route color, but add a red border if affected
                  const strokeColor = isAffected ? "#dc2626" : routeColor;
                  const fillColor = routeColor;

                  return (
                    <CircleMarker
                      key={p.id}
                      center={[p.latitude, p.longitude]}
                      radius={isSelected ? 10 : isAffected ? 8 : 6}
                      pathOptions={{
                        color: strokeColor,
                        weight: isAffected ? 3 : isSelected ? 2 : 1,
                      }}
                      fillColor={fillColor}
                      fillOpacity={isSelected ? 0.9 : 0.7}
                      eventHandlers={{
                        click: () => setSelectedId(p.id),
                        mouseover: () => setSelectedId(p.id),
                      }}
                    >
                      <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                        <div>
                          <strong>{p.label ?? p.id}</strong>
                          <div
                            className="text-xs"
                            style={{ color: routeColor }}
                          >
                            Ruta: {p.routeId ?? "desconocida"}
                          </div>
                          {alertLabels.length > 0 && (
                            <div className="text-xs text-red-600">
                              ⚠ {alertLabels.length} alert
                              {alertLabels.length > 1 ? "s" : ""}
                            </div>
                          )}
                        </div>
                      </Tooltip>
                    </CircleMarker>
                  );
                })}
              </MapContainer>
            </div>

            {/* Route Legend */}
            <div className="mt-3">
              <div className="text-xs font-medium text-muted-foreground mb-2">
                Leyenda de Rutas ({routeColorMap.size} rutas):
              </div>
              <div className="flex flex-wrap gap-2">
                {[...routeColorMap.entries()]
                  .slice(0, 20)
                  .map(([routeId, color]) => (
                    <div
                      key={routeId}
                      className="flex items-center gap-1 text-xs"
                    >
                      <span style={{ color }}>●</span>
                      <span className="truncate max-w-[80px]" title={routeId}>
                        {routeId}
                      </span>
                    </div>
                  ))}
                {routeColorMap.size > 20 && (
                  <span className="text-xs text-muted-foreground">
                    +{routeColorMap.size - 20} más
                  </span>
                )}
              </div>
            </div>

            <p className="mt-2 text-xs text-muted-foreground">
              Source: https://gtfsrt.renfe.com/vehicle_positions.json
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
