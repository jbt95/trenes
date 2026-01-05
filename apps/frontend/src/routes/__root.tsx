import { Link, Outlet, createRootRoute } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { cn } from "@/lib/utils";

export const Route = createRootRoute({
  component: () => (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="font-semibold tracking-tight">
            trenes
          </Link>
          <nav className="flex items-center gap-1">
            <Link
              to="/"
              className={cn(
                "rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              )}
              activeProps={{ className: "text-foreground bg-accent" }}
            >
              Inicio
            </Link>
            <Link
              to="/vehicles"
              className={cn(
                "rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              )}
              activeProps={{ className: "text-foreground bg-accent" }}
            >
              Vehículos
            </Link>
            <Link
              to="/insights"
              className={cn(
                "rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              )}
              activeProps={{ className: "text-foreground bg-accent" }}
            >
              Análisis
            </Link>
            <Link
              to="/alerts"
              className={cn(
                "rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              )}
              activeProps={{ className: "text-foreground bg-accent" }}
            >
              Alertas
            </Link>
            <Link
              to="/history"
              className={cn(
                "rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              )}
              activeProps={{ className: "text-foreground bg-accent" }}
            >
              Historial
            </Link>
            <Link
              to="/about"
              className={cn(
                "rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              )}
              activeProps={{ className: "text-foreground bg-accent" }}
            >
              Acerca de
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
      <TanStackRouterDevtools />
    </>
  ),
});
