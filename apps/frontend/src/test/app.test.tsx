import { RouterProvider, createMemoryHistory, createRouter } from "@tanstack/react-router";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { routeTree } from "../routeTree.gen";

describe("Frontend App", () => {
  it("renders without crashing", async () => {
    const memoryHistory = createMemoryHistory({
      initialEntries: ["/"],
    });

    const router = createRouter({
      routeTree,
      history: memoryHistory,
    });

    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByText(/Welcome to the Frontend App/i)).toBeInTheDocument();
    });
  });
});
