import { createFileRoute } from "@tanstack/react-router";
import React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fetchRenfeAlerts, type RenfeAlert } from "@/lib/alerts";

export const Route = createFileRoute("/alerts")({
  component: Alerts,
});

type LoadState =
  | { readonly kind: "loading" }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "loaded"; readonly alerts: readonly RenfeAlert[] };

const formatUnixSeconds = (seconds: number | null): string => {
  if (seconds === null) return "—";
  const date = new Date(seconds * 1000);
  return Number.isNaN(date.getTime()) ? String(seconds) : date.toLocaleString();
};

const compactEntity = (
  entity: RenfeAlert["informedEntities"][number]
): string => {
  const parts = [
    entity.agencyId ? `agency:${entity.agencyId}` : null,
    entity.routeId ? `route:${entity.routeId}` : null,
    entity.tripId ? `trip:${entity.tripId}` : null,
    entity.stopId ? `stop:${entity.stopId}` : null,
  ].filter((p): p is string => p !== null);

  return parts.length ? parts.join(" · ") : "(no entity info)";
};

function Alerts() {
  const [state, setState] = React.useState<LoadState>({ kind: "loading" });
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const reload = React.useCallback(async (signal?: AbortSignal) => {
    const alerts = await fetchRenfeAlerts(signal);
    setState({ kind: "loaded", alerts });
    setSelectedId((prev) =>
      prev && alerts.some((a) => a.id === prev) ? prev : null
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

  if (state.kind === "loading") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Alertas Renfe</h1>
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
          <h1 className="text-3xl font-bold tracking-tight">Alertas Renfe</h1>
          <p className="mt-2 text-destructive">{state.message}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Consejo: asegúrate de que el backend esté ejecutándose y que
            VITE_API_URL apunte a él.
          </p>
        </div>
        <Button variant="outline" onClick={() => void onRefresh()}>
          Reintentar
        </Button>
      </div>
    );
  }

  const alerts = state.alerts;
  const selected = alerts.find((a) => a.id === selectedId) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alertas Renfe</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {alerts.length} alertas
          </p>
        </div>
        <Button variant="outline" onClick={() => void onRefresh()}>
          Actualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Lista</CardTitle>
            <CardDescription>
              Haz clic en una alerta para ver detalles.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[520px]">
              <ul className="divide-y">
                {alerts.map((a) => {
                  const isSelected = a.id === selectedId;
                  const title = a.header ?? a.effect ?? a.id;

                  return (
                    <li key={a.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(a.id)}
                        className={`w-full rounded-md px-3 py-3 text-left transition-colors hover:bg-accent ${
                          isSelected ? "bg-accent" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate font-medium">{title}</div>
                            <div className="truncate text-sm text-muted-foreground">
                              {a.cause ?? "—"} · {a.effect ?? "—"}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">
                              {formatUnixSeconds(a.start)} →{" "}
                              {formatUnixSeconds(a.end)}
                            </div>
                          </div>
                          <div className="shrink-0 text-xs text-muted-foreground">
                            {a.informedEntities.length} entidades
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
            <CardTitle>Detalles</CardTitle>
            <CardDescription>
              {selected
                ? (selected.header ?? selected.id)
                : "Selecciona una alerta"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selected ? (
              <p className="text-sm text-muted-foreground">
                Ninguna alerta seleccionada.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-2">
                  <div className="text-sm">
                    <span className="font-medium">Causa:</span>{" "}
                    {selected.cause ?? "—"}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Efecto:</span>{" "}
                    {selected.effect ?? "—"}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Activa:</span>{" "}
                    {formatUnixSeconds(selected.start)} →{" "}
                    {formatUnixSeconds(selected.end)}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">URL:</span>{" "}
                    {selected.url ? (
                      <a
                        className="underline"
                        href={selected.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Abrir
                      </a>
                    ) : (
                      "—"
                    )}
                  </div>
                </div>

                {selected.description ? (
                  <div>
                    <div className="text-sm font-medium">Descripción</div>
                    <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                      {selected.description}
                    </p>
                  </div>
                ) : null}

                <div>
                  <div className="text-sm font-medium">Entidades afectadas</div>
                  {selected.informedEntities.length ? (
                    <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                      {selected.informedEntities.slice(0, 50).map((ie, idx) => (
                        <li key={`${selected.id}:${idx}`}>
                          {compactEntity(ie)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">—</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        Fuente: https://gtfsrt.renfe.com/alerts.json
      </p>
    </div>
  );
}
