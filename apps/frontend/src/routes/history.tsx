import { createFileRoute } from "@tanstack/react-router";
import React from "react";
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getApiBaseUrl } from "@/lib/api";

export const Route = createFileRoute("/history")({
  component: History,
});

type HistorySummary = {
  readonly totalSnapshots: number;
  readonly oldestSnapshot: string | null;
  readonly newestSnapshot: string | null;
  readonly totalVehicleRecords: number;
  readonly totalAlertRecords: number;
  readonly uniqueVehicleIds: number;
  readonly uniqueAlertIds: number;
  readonly snapshotsByDay: readonly { date: string; count: number }[];
};

type SnapshotInfo = {
  readonly id: string;
  readonly timestamp: number;
  readonly vehicleCount: number;
  readonly alertCount: number;
};

type SnapshotDetail = {
  readonly id: string;
  readonly timestamp: number;
  readonly vehicleCount: number;
  readonly alertCount: number;
  readonly vehicles: readonly {
    id: string;
    label: string | null;
    routeId: string | null;
    latitude: number;
    longitude: number;
  }[];
  readonly alerts: readonly {
    id: string;
    header: string | null;
    effect: string | null;
    isActive: boolean;
  }[];
};

type LoadState =
  | { readonly kind: "loading" }
  | { readonly kind: "error"; readonly message: string }
  | {
      readonly kind: "loaded";
      readonly summary: HistorySummary;
      readonly snapshots: readonly SnapshotInfo[];
    };

const API_URL = getApiBaseUrl();

async function fetchHistorySummary(
  signal?: AbortSignal
): Promise<HistorySummary> {
  const res = await fetch(`${API_URL}/renfe/history/summary`, { signal });
  if (!res.ok)
    throw new Error(`Failed to fetch history summary: ${res.status}`);
  return res.json();
}

async function fetchSnapshots(
  from?: string,
  to?: string,
  signal?: AbortSignal
): Promise<readonly SnapshotInfo[]> {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const url = `${API_URL}/renfe/history/snapshots${params.toString() ? `?${params}` : ""}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Failed to fetch snapshots: ${res.status}`);
  return res.json();
}

async function fetchSnapshotDetail(
  id: string,
  signal?: AbortSignal
): Promise<SnapshotDetail> {
  const res = await fetch(`${API_URL}/renfe/history/snapshots/${id}`, {
    signal,
  });
  if (!res.ok) throw new Error(`Failed to fetch snapshot: ${res.status}`);
  return res.json();
}

async function captureSnapshot(signal?: AbortSignal): Promise<{ id: string }> {
  const res = await fetch(`${API_URL}/renfe/history/capture`, {
    method: "POST",
    signal,
  });
  if (!res.ok) throw new Error(`Failed to capture snapshot: ${res.status}`);
  return res.json();
}

const formatDate = (iso: string | null): string => {
  if (!iso) return "—";
  const date = new Date(iso);
  return date.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatTimestamp = (ts: number): string => {
  const date = new Date(ts);
  return date.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

function History() {
  const [state, setState] = React.useState<LoadState>({ kind: "loading" });
  const [selectedSnapshot, setSelectedSnapshot] =
    React.useState<SnapshotDetail | null>(null);
  const [isCapturing, setIsCapturing] = React.useState(false);
  const [dateRange, setDateRange] = React.useState<{
    from: string;
    to: string;
  }>({
    from: "",
    to: "",
  });

  const reload = React.useCallback(
    async (signal?: AbortSignal) => {
      const [summary, snapshots] = await Promise.all([
        fetchHistorySummary(signal),
        fetchSnapshots(
          dateRange.from || undefined,
          dateRange.to || undefined,
          signal
        ),
      ]);
      setState({ kind: "loaded", summary, snapshots });
    },
    [dateRange.from, dateRange.to]
  );

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

  const onCapture = async (): Promise<void> => {
    try {
      setIsCapturing(true);
      await captureSnapshot();
      await reload();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error capturing snapshot");
    } finally {
      setIsCapturing(false);
    }
  };

  const onSelectSnapshot = async (id: string): Promise<void> => {
    try {
      const detail = await fetchSnapshotDetail(id);
      setSelectedSnapshot(detail);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error loading snapshot");
    }
  };

  if (state.kind === "loading") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Historial</h1>
            <p className="text-sm text-muted-foreground">Cargando…</p>
          </div>
          <Button variant="outline" onClick={() => void onRefresh()}>
            Actualizar
          </Button>
        </div>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Historial</h1>
          <p className="mt-2 text-destructive">{state.message}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Consejo: asegúrate de que el backend esté ejecutándose y que el cron
            job esté activo.
          </p>
        </div>
        <Button variant="outline" onClick={() => void onRefresh()}>
          Reintentar
        </Button>
      </div>
    );
  }

  const { summary, snapshots } = state;

  // Prepare chart data for snapshots over time
  const timelineData = snapshots.slice(-50).map((s) => ({
    time: new Date(s.timestamp).toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    vehicles: s.vehicleCount,
    alerts: s.alertCount,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Historial de Datos
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {summary.totalSnapshots} capturas almacenadas · Desde{" "}
            {formatDate(summary.oldestSnapshot)} hasta{" "}
            {formatDate(summary.newestSnapshot)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => void onCapture()}
            disabled={isCapturing}
          >
            {isCapturing ? "Capturando..." : "📸 Capturar ahora"}
          </Button>
          <Button variant="outline" onClick={() => void onRefresh()}>
            Actualizar
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Capturas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary.totalSnapshots}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Registros Vehículos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {summary.totalVehicleRecords.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary.uniqueVehicleIds} únicos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Registros Alertas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {summary.totalAlertRecords.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary.uniqueAlertIds} únicas
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Capturas por Día</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {summary.snapshotsByDay.length > 0
                ? Math.round(
                    summary.totalSnapshots / summary.snapshotsByDay.length
                  )
                : 0}
            </div>
            <p className="text-xs text-muted-foreground">promedio</p>
          </CardContent>
        </Card>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1">
              <label
                htmlFor="date-from"
                className="text-xs font-medium text-muted-foreground"
              >
                Desde
              </label>
              <input
                id="date-from"
                type="datetime-local"
                value={dateRange.from}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, from: e.target.value }))
                }
                className="h-9 rounded-md border px-3 text-sm bg-background"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label
                htmlFor="date-to"
                className="text-xs font-medium text-muted-foreground"
              >
                Hasta
              </label>
              <input
                id="date-to"
                type="datetime-local"
                value={dateRange.to}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, to: e.target.value }))
                }
                className="h-9 rounded-md border px-3 text-sm bg-background"
              />
            </div>
            {(dateRange.from || dateRange.to) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDateRange({ from: "", to: "" })}
              >
                Limpiar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Evolución Temporal</CardTitle>
            <CardDescription>
              Vehículos y alertas a lo largo del tiempo (últimas 50 capturas)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timelineData}>
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="vehicles"
                    stroke="#3b82f6"
                    name="Vehículos"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="alerts"
                    stroke="#ef4444"
                    name="Alertas"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Capturas por Día</CardTitle>
            <CardDescription>Distribución de capturas diarias</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary.snapshotsByDay.slice(-14)}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" name="Capturas" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Snapshots List */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Lista de Capturas</CardTitle>
            <CardDescription>
              Haz clic en una captura para ver detalles ({snapshots.length}{" "}
              mostradas)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              {snapshots.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No hay capturas en el rango seleccionado.
                </p>
              ) : (
                <ul className="divide-y">
                  {snapshots
                    .slice()
                    .reverse()
                    .map((s) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => void onSelectSnapshot(s.id)}
                          className={`w-full rounded-md px-3 py-3 text-left transition-colors hover:bg-accent ${
                            selectedSnapshot?.id === s.id ? "bg-accent" : ""
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-medium text-sm">
                                {formatTimestamp(s.timestamp)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {s.vehicleCount} vehículos · {s.alertCount}{" "}
                                alertas
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {s.id.slice(0, 8)}
                            </div>
                          </div>
                        </button>
                      </li>
                    ))}
                </ul>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Detalle de Captura</CardTitle>
            <CardDescription>
              {selectedSnapshot
                ? formatTimestamp(selectedSnapshot.timestamp)
                : "Selecciona una captura"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedSnapshot ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Ninguna captura seleccionada.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground">ID</div>
                    <div className="font-mono text-xs">
                      {selectedSnapshot.id}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">
                      Timestamp
                    </div>
                    <div className="text-sm">
                      {formatTimestamp(selectedSnapshot.timestamp)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">
                      Vehículos
                    </div>
                    <div className="font-medium">
                      {selectedSnapshot.vehicleCount}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Alertas</div>
                    <div className="font-medium">
                      {selectedSnapshot.alertCount}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium mb-2">
                    Muestra de vehículos (primeros 10):
                  </div>
                  <ScrollArea className="h-[120px]">
                    <ul className="text-xs space-y-1">
                      {selectedSnapshot.vehicles.slice(0, 10).map((v) => (
                        <li key={v.id} className="text-muted-foreground">
                          <span className="font-medium text-foreground">
                            {v.label ?? v.id}
                          </span>
                          {v.routeId && (
                            <span className="ml-1 text-blue-600">
                              ({v.routeId})
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                </div>

                {selectedSnapshot.alerts.length > 0 && (
                  <div>
                    <div className="text-sm font-medium mb-2">
                      Alertas activas:
                    </div>
                    <ScrollArea className="h-[120px]">
                      <ul className="text-xs space-y-1">
                        {selectedSnapshot.alerts
                          .filter((a) => a.isActive)
                          .map((a) => (
                            <li key={a.id} className="text-muted-foreground">
                              <span className="font-medium text-foreground">
                                {a.header ?? a.id}
                              </span>
                              {a.effect && (
                                <span className="ml-1 text-orange-600">
                                  ({a.effect})
                                </span>
                              )}
                            </li>
                          ))}
                      </ul>
                    </ScrollArea>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
