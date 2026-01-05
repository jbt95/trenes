import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  component: About,
});

function About() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Acerca de</h1>
        <p className="mt-2 text-muted-foreground">
          Monorepo boilerplate + una pequeña POC de Renfe.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tecnologías</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Turborepo, TypeScript, Biome, TanStack Router, NestJS, Vitest.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
