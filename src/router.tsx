import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000, // 1 minute: data stays fresh, avoiding repeat network calls
        gcTime: 10 * 60_000, // 10 minutes: keep unused data in memory
        refetchOnWindowFocus: false, // prevent mass refetch spikes when users tab back
        retry: 1,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadDelay: 50,
    defaultPreloadStaleTime: 60_000,
    defaultStaleTime: 60_000,
    // Keep the current page visible a bit longer instead of flashing spinners
    defaultPendingMs: 400,
    defaultPendingMinMs: 200,
  });

  return router;
};
