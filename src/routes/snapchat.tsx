import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/snapchat")({
  beforeLoad: () => {
    throw redirect({ to: "/product/$slug", params: { slug: "snapchat" }, replace: true });
  },
});
