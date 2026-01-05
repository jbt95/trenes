import { Link, Outlet, createRootRoute } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";

export const Route = createRootRoute({
  component: () => (
    <>
      <div className="border-b border-gray-200 bg-white shadow-sm">
        <nav className="container mx-auto flex gap-6 px-4 py-4">
          <Link
            to="/"
            className="text-blue-600 hover:text-blue-800 transition-colors"
            activeProps={{ className: "font-semibold" }}
          >
            Home
          </Link>
          <Link
            to="/about"
            className="text-blue-600 hover:text-blue-800 transition-colors"
            activeProps={{ className: "font-semibold" }}
          >
            About
          </Link>
        </nav>
      </div>
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
      <TanStackRouterDevtools />
    </>
  ),
});
