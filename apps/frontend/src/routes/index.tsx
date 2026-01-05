import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { type RenfeInsights, fetchRenfeInsights } from "@/lib/insights";
import { Link, createFileRoute } from "@tanstack/react-router";
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

export const Route = createFileRoute("/")({
  component: Index,
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

function Index() {
  const [state, setState] = React.useState<LoadState>({ kind: "loading" });

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
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Panel de Control</h1>
            <p className="mt-2 text-muted-foreground">Cargando datos en tiempo real…</p>
          </div>
        </div>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Panel de Control</h1>
          <p className="mt-2 text-destructive">{state.message}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Consejo: asegúrate de que el backend esté ejecutándose en el puerto 4000.
          </p>
        </div>
        <Button variant="outline" onClick={() => void onRefresh()}>
          Reintentar
        </Button>
      </div>
    );
  }

  const { insights } = state;
  const activeAlertsList = insights.alertTimeline.filter((a) => a.isActiveNow).slice(0, 8);
  const topDisruptedRoutes = insights.routeSummaries.filter((r) => r.alertCount > 0).slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Panel de Control</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Resumen en tiempo real de Renfe · actualizado {formatUnixSeconds(insights.generatedAt)}
          </p>
        </div>
        <Button variant="outline" onClick={() => void onRefresh()}>
          Actualizar
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Vehículos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{insights.totals.vehicles}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Alertas Activas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-500">{insights.totals.activeAlerts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Alertas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{insights.totals.alerts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Vehículos Afectados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-500">
              {insights.totals.vehiclesMatched}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Rutas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{insights.totals.uniqueRoutes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Rutas c/ Alertas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-500">
              {insights.totals.routesWithAlerts}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Alerts by Effect Pie */}
        <Card>
          <CardHeader>
            <CardTitle>Alertas por Efecto</CardTitle>
            <CardDescription>Distribución de tipos de alerta</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[...insights.alertsByEffect.slice(0, 6)]}
                    dataKey="count"
                    nameKey="key"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ key }) => key?.toString().replace("_", " ")}
                    labelLine={false}
                  >
                    {insights.alertsByEffect.slice(0, 6).map((entry) => (
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

        {/* Alerts by Cause */}
        <Card>
          <CardHeader>
            <CardTitle>Alertas por Causa</CardTitle>
            <CardDescription>Causas raíz de las incidencias</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={insights.alertsByCause.slice(0, 6)}
                  layout="vertical"
                  margin={{ left: 60 }}
                >
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="key" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Alert Duration Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Duración de Alertas</CardTitle>
            <CardDescription>Cuánto suelen durar las incidencias</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[240px]">
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

      {/* Tables Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Active Alerts */}
        <Card>
          <CardHeader>
            <CardTitle>Alertas Activas</CardTitle>
            <CardDescription>Incidencias en curso actualmente</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[280px]">
              {activeAlertsList.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin alertas activas 🎉</p>
              ) : (
                <ul className="space-y-2">
                  {activeAlertsList.map((a) => (
                    <li key={a.alertId} className="rounded-md border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate font-medium text-sm">
                            {a.header ?? a.alertId}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {a.effect?.replace("_", " ")} · {a.cause?.replace("_", " ") ?? "—"}
                          </div>
                          {a.durationMinutes && (
                            <div className="text-xs text-orange-600">
                              Duración: {a.durationMinutes} min
                            </div>
                          )}
                        </div>
                        <span className="shrink-0 inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800">
                          Activa
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </ScrollArea>
            <div className="mt-3">
              <Link to="/alerts">
                <Button variant="outline" size="sm" className="w-full">
                  Ver todas las alertas →
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Most Disrupted Routes */}
        <Card>
          <CardHeader>
            <CardTitle>Rutas Más Afectadas</CardTitle>
            <CardDescription>Rutas con más actividad de alertas</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[280px]">
              {topDisruptedRoutes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin rutas con alertas</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2 text-left font-medium">Ruta</th>
                      <th className="py-2 text-right font-medium">Vehículos</th>
                      <th className="py-2 text-right font-medium">Alertas</th>
                      <th className="py-2 text-right font-medium">Activas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topDisruptedRoutes.map((r) => (
                      <tr key={r.routeId} className="border-b last:border-b-0">
                        <td className="py-2 font-mono text-xs">{r.routeId}</td>
                        <td className="py-2 text-right tabular-nums">{r.vehicleCount}</td>
                        <td className="py-2 text-right tabular-nums">{r.alertCount}</td>
                        <td className="py-2 text-right tabular-nums">
                          {r.activeAlertCount > 0 ? (
                            <span className="text-orange-600">{r.activeAlertCount}</span>
                          ) : (
                            "0"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </ScrollArea>
            <div className="mt-3">
              <Link to="/insights">
                <Button variant="outline" size="sm" className="w-full">
                  Ver análisis →
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts by Hour */}
      <Card>
        <CardHeader>
          <CardTitle>Alertas por Hora</CardTitle>
          <CardDescription>¿Cuándo suelen comenzar las incidencias?</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
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

      {/* Quick Links */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Link to="/vehicles" className="block">
          <Card className="transition-colors hover:bg-accent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">🚂 Vehículos</CardTitle>
              <CardDescription>
                Ver {insights.totals.vehicles} vehículos en mapa interactivo
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/alerts" className="block">
          <Card className="transition-colors hover:bg-accent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">⚠️ Alertas</CardTitle>
              <CardDescription>
                Explorar {insights.totals.alerts} alertas de servicio
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/insights" className="block">
          <Card className="transition-colors hover:bg-accent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">📊 Análisis</CardTitle>
              <CardDescription>Estadísticas, correlaciones y salud de rutas</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
