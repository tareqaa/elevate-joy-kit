import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/games/$slug")({
  loader: async ({ params }) => {
    throw redirect({
      to: "/category/$slug",
      params: { slug: params.slug },
      replace: true,
    });
  },
  component: () => null,
});

