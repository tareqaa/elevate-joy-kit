import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/fortnite")({
  beforeLoad: () => {
    throw redirect({ to: "/product/$slug", params: { slug: "fortnite" }, replace: true });
  },
});
