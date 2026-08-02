import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/gift-cards/$slug")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/product/$slug", params: { slug: params.slug }, replace: true });
  },
});
