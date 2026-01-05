import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="space-y-4">
      <h1 className="text-4xl font-bold text-gray-900">
        Welcome to the Frontend App
      </h1>
      <p className="text-lg text-gray-600">
        Built with Tanstack Router, React, Vite, and Tailwind CSS
      </p>
    </div>
  );
}
