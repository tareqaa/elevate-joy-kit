import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import React, { lazy } from "react";

// Lazy-load heavy components that aren't needed for the initial render
const GxBlastPage = lazy(() => import("./routes/games.blast").then(m => ({ default: m.Route.options.component })));
const TournamentPage = lazy(() => import("./routes/games.t.$id").then(m => ({ default: m.Route.options.component })));

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadDelay: 20,
    defaultPreloadStaleTime: 0,
    defaultPendingMs: 400,
    defaultPendingMinMs: 200,
  });

  return router;
};
