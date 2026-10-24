import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/stock")({
  head: () => ({ meta: [{ title: "إدارة المخزون والمقاعد — لوحة التحكم" }] }),
  beforeLoad: () => {
    throw redirect({ to: "/admin/products", search: { tab: "stock" } as never });
  },
  component: () => null,
});
