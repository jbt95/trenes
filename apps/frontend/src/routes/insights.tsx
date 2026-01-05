import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { type RenfeInsights, fetchRenfeInsights } from "@/lib/insights";
import { createFileRoute } from "@tanstack/react-router";
import React from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const Route = createFileRoute("/insights")({
  component: Insights,
});

type LoadState =
  | { readonly kind: "loading" }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "loaded"; readonly insights: RenfeInsights };

const COLORS = [
  "#3b82f6",
  "#22c55e",
  "#f97316",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#eab308",
];

const formatUnixSeconds = (seconds: number | null): string => {
  if (seconds === null) return "—";
  const date = new Date(seconds * 1000);
  return Number.isNaN(date.getTime()) ? String(seconds) : date.toLocaleString();
};

const formatDuration = (minutes: number | null): string => {
  if (minutes === null) return "—";
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

function Insights() {
  const [state, setState] = React.useState<LoadState>({ kind: "loading" });
  const [activeTab, setActiveTab] = React.useState<
    "overview" | "routes" | "timeline" | "correlations"
  >("overview");

  const reload = React.useCallback(async (signal?: AbortSignal) => {
    const insights = await fetchRenfeInsights(signal);
    setState({ kind: "loaded", insights });
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

  if (state.kind === "loading") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Análisis</h1>
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
          <h1 className="text-3xl font-bold tracking-tight">Análisis</h1>
          <p className="mt-2 text-destructive">{state.message}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Consejo: asegúrate de que el backend esté ejecutándose y que VITE_API_URL apunte a él.
          </p>
        </div>
        <Button variant="outline" onClick={() => void onRefresh()}>
          Reintentar
        </Button>
      </div>
    );
  }

  const { insights } = state;

  const tabs = [
    { id: "overview" as const, label: "Resumen" },
    { id: "routes" as const, label: "Salud de Rutas" },
    { id: "timeline" as const, label: "Línea de Tiempo" },
    { id: "correlations" as const, label: "Correlaciones" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Análisis</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            generado el {formatUnixSeconds(insights.generatedAt)}
          </p>
        </div>
        <Button variant="outline" onClick={() => void onRefresh()}>
          Actualizar
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Vehículos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{insights.totals.vehicles}</div>
                <p className="text-xs text-muted-foreground">
                  Coincidentes: {insights.totals.vehiclesMatched}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Alertas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{insights.totals.alerts}</div>
                <p className="text-xs text-orange-600">Activas: {insights.totals.activeAlerts}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Rutas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{insights.totals.uniqueRoutes}</div>
                <p className="text-xs text-orange-600">
                  Con alertas: {insights.totals.routesWithAlerts}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Correlaciones</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{insights.totals.alertsWithMatches}</div>
                <p className="text-xs text-muted-foreground">Alertas con vehículos</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Alertas por Efecto</CardTitle>
                <CardDescription>Distribución por tipo</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[...insights.alertsByEffect.slice(0, 8)]}
                        dataKey="count"
                        nameKey="key"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ key, percent }) =>
                          `${key?.toString().replace(/_/g, " ")} (${((percent ?? 0) * 100).toFixed(0)}%)`
                        }
                        labelLine={false}
                      >
                        {insights.alertsByEffect.slice(0, 8).map((entry) => (
                          <Cell
                            key={entry.key}
                            fill={COLORS[insights.alertsByEffect.indexOf(entry) % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Alertas por Causa</CardTitle>
                <CardDescription>Causas raíz de incidentes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={insights.alertsByCause.slice(0, 8)}
                      layout="vertical"
                      margin={{ left: 80, right: 16 }}
                    >
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis type="category" dataKey="key" tick={{ fontSize: 11 }} width={100} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Alertas por Hora</CardTitle>
                <CardDescription>¿Cuándo comienzan los incidentes?</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[...insights.alertsByHour]} margin={{ left: 8, right: 8 }}>
                      <XAxis dataKey="key" tick={{ fontSize: 10 }} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8b5cf6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribución de Duración de Alertas</CardTitle>
                <CardDescription>¿Cuánto duran los incidentes?</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[...insights.alertDurationDistribution]}
                      margin={{ left: 8, right: 8 }}
                    >
                      <XAxis dataKey="key" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#22c55e" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Distribución de Estado de Vehículos</CardTitle>
              <CardDescription>Estado actual de todos los vehículos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[...insights.vehiclesByStatus]} margin={{ left: 8, right: 8 }}>
                    <XAxis dataKey="key" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#06b6d4" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Routes Tab */}
      {activeTab === "routes" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tabla de Salud de Rutas</CardTitle>
              <CardDescription>
                Rutas ordenadas por número de alertas ({insights.routeSummaries.length} total)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background">
                    <tr className="border-b">
                      <th className="px-2 py-2 text-left font-medium">ID Ruta</th>
                      <th className="px-2 py-2 text-right font-medium">Vehículos</th>
                      <th className="px-2 py-2 text-right font-medium">Alertas</th>
                      <th className="px-2 py-2 text-right font-medium">Activas</th>
                      <th className="px-2 py-2 text-left font-medium">Efectos</th>
                      <th className="px-2 py-2 text-left font-medium">Última Actualización</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insights.routeSummaries.map((r) => (
                      <tr key={r.routeId} className="border-b last:border-b-0">
                        <td className="px-2 py-2 font-mono text-xs">{r.routeId}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{r.vehicleCount}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{r.alertCount}</td>
                        <td className="px-2 py-2 text-right tabular-nums">
                          {r.activeAlertCount > 0 ? (
                            <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800">
                              {r.activeAlertCount}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </td>
                        <td
                          className="px-2 py-2 text-xs max-w-[200px] truncate"
                          title={r.effects.join(", ")}
                        >
                          {r.effects.map((e) => e.replace(/_/g, " ")).join(", ") || "—"}
                        </td>
                        <td className="px-2 py-2 text-xs text-muted-foreground">
                          {formatUnixSeconds(r.lastVehicleUpdate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top 10 Rutas por Alertas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={insights.routeSummaries.slice(0, 10).map((r) => ({
                        route: r.routeId.length > 12 ? `${r.routeId.slice(0, 12)}…` : r.routeId,
                        alerts: r.alertCount,
                        active: r.activeAlertCount,
                      }))}
                      layout="vertical"
                      margin={{ left: 80, right: 16 }}
                    >
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis type="category" dataKey="route" tick={{ fontSize: 10 }} width={90} />
                      <Tooltip />
                      <Bar dataKey="alerts" fill="#ef4444" name="Total Alertas" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top 10 Rutas por Vehículos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[...insights.routeSummaries]
                        .sort((a, b) => b.vehicleCount - a.vehicleCount)
                        .slice(0, 10)
                        .map((r) => ({
                          route: r.routeId.length > 12 ? `${r.routeId.slice(0, 12)}…` : r.routeId,
                          vehicles: r.vehicleCount,
                        }))}
                      layout="vertical"
                      margin={{ left: 80, right: 16 }}
                    >
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis type="category" dataKey="route" tick={{ fontSize: 10 }} width={90} />
                      <Tooltip />
                      <Bar dataKey="vehicles" fill="#3b82f6" name="Vehículos" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Timeline Tab */}
      {activeTab === "timeline" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Línea de Tiempo de Alertas</CardTitle>
              <CardDescription>
                Todas las alertas ordenadas por hora de inicio ({insights.alertTimeline.length}{" "}
                total)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[700px]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background">
                    <tr className="border-b">
                      <th className="px-2 py-2 text-left font-medium">Estado</th>
                      <th className="px-2 py-2 text-left font-medium">Alerta</th>
                      <th className="px-2 py-2 text-left font-medium">Causa</th>
                      <th className="px-2 py-2 text-left font-medium">Efecto</th>
                      <th className="px-2 py-2 text-left font-medium">Inicio</th>
                      <th className="px-2 py-2 text-left font-medium">Fin</th>
                      <th className="px-2 py-2 text-right font-medium">Duración</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insights.alertTimeline.map((a) => (
                      <tr key={a.alertId} className="border-b last:border-b-0">
                        <td className="px-2 py-2">
                          {a.isActiveNow ? (
                            <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800">
                              Activa
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                              Finalizada
                            </span>
                          )}
                        </td>
                        <td
                          className="px-2 py-2 max-w-[280px] truncate"
                          title={a.header ?? a.alertId}
                        >
                          {a.header ?? a.alertId}
                        </td>
                        <td className="px-2 py-2 text-xs">{a.cause?.replace(/_/g, " ") ?? "—"}</td>
                        <td className="px-2 py-2 text-xs">{a.effect?.replace(/_/g, " ") ?? "—"}</td>
                        <td className="px-2 py-2 text-xs text-muted-foreground">
                          {formatUnixSeconds(a.start)}
                        </td>
                        <td className="px-2 py-2 text-xs text-muted-foreground">
                          {a.end ? formatUnixSeconds(a.end) : "en curso"}
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums text-xs">
                          {formatDuration(a.durationMinutes)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Correlations Tab */}
      {activeTab === "correlations" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Correlaciones Incidente ↔ Vehículo</CardTitle>
              <CardDescription>
                Alertas correlacionadas con vehículos por tripId/routeId (
                {insights.correlations.length} alertas)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="min-w-[1000px]">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-background">
                      <tr className="border-b">
                        <th className="px-2 py-2 text-left font-medium">Alerta</th>
                        <th className="px-2 py-2 text-left font-medium">Causa</th>
                        <th className="px-2 py-2 text-left font-medium">Efecto</th>
                        <th className="px-2 py-2 text-left font-medium">Activa</th>
                        <th className="px-2 py-2 text-right font-medium">Vehículos</th>
                        <th className="px-2 py-2 text-left font-medium">TripIds / RouteIds</th>
                      </tr>
                    </thead>
                    <tbody>
                      {insights.correlations.map((c) => {
                        const title = c.header ?? c.alertId;
                        const keys = [
                          ...c.matchedTripIds.map((t) => `trip:${t}`),
                          ...c.matchedRouteIds.map((r) => `route:${r}`),
                        ];

                        return (
                          <tr key={c.alertId} className="border-b last:border-b-0">
                            <td className="px-2 py-2 max-w-[320px] truncate" title={title}>
                              {title}
                            </td>
                            <td className="px-2 py-2 max-w-[140px] truncate text-xs">
                              {c.cause?.replace(/_/g, " ") ?? "—"}
                            </td>
                            <td className="px-2 py-2 max-w-[140px] truncate text-xs">
                              {c.effect?.replace(/_/g, " ") ?? "—"}
                            </td>
                            <td className="px-2 py-2">
                              {c.isActiveNow ? (
                                <span className="text-orange-600 text-xs">sí</span>
                              ) : (
                                <span className="text-muted-foreground text-xs">no</span>
                              )}
                            </td>
                            <td className="px-2 py-2 text-right tabular-nums">
                              {c.matchedVehicleCount > 0 ? (
                                <span className="font-medium">{c.matchedVehicleCount}</span>
                              ) : (
                                <span className="text-muted-foreground">0</span>
                              )}
                            </td>
                            <td
                              className="px-2 py-2 max-w-[300px] truncate text-xs text-muted-foreground"
                              title={keys.join(" · ")}
                            >
                              {keys.join(" · ") || "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground">
            Lógica de correlación: alert.informedEntity.tripId / routeId coincide con
            vehiclePosition.tripId / routeId.
          </p>
        </div>
      )}
    </div>
  );
}
