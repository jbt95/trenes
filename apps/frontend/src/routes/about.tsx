import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  component: About,
});

function About() {
  return (
    <div className="space-y-4">
      <h1 className="text-4xl font-bold text-gray-900">About</h1>
      <p className="text-lg text-gray-600">
        This is a monorepo boilerplate with Turborepo and modern tooling.
      </p>
    </div>
  );
}
