import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({ meta: [{ title: "المستخدمون — لوحة التحكم" }] }),
  component: UsersAdmin,
});

function UsersAdmin() {
  const qc = useQueryClient();
  const usersQ = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;
      const roleMap = new Map<string, Set<string>>();
      (rolesRes.data ?? []).forEach((r) => {
        if (!roleMap.has(r.user_id)) roleMap.set(r.user_id, new Set());
        roleMap.get(r.user_id)!.add(r.role);
      });
      return (profilesRes.data ?? []).map((p) => ({ ...p, roles: Array.from(roleMap.get(p.id) ?? []) }));
    },
  });

  const toggleAdmin = useMutation({
    mutationFn: async ({ userId, makeAdmin }: { userId: string; makeAdmin: boolean }) => {
      if (makeAdmin) {
        const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
        if (error && !error.message.includes("duplicate")) throw error;
      } else {
        const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("تم التحديث"); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader><CardTitle>المستخدمون ({usersQ.data?.length ?? 0})</CardTitle></CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground border-b">
              <tr className="text-right">
                <th className="p-2">الاسم</th>
                <th className="p-2">الإيميل</th>
                <th className="p-2">XP</th>
                <th className="p-2">المستوى</th>
                <th className="p-2">المشتريات</th>
                <th className="p-2">الصلاحيات</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {usersQ.data?.map((u) => {
                const isAdmin = u.roles.includes("admin");
                return (
                  <tr key={u.id} className="border-b hover:bg-accent/30">
                    <td className="p-2">{u.full_name || "—"}</td>
                    <td className="p-2" dir="ltr">{u.email}</td>
                    <td className="p-2">{u.xp}</td>
                    <td className="p-2">{u.level}</td>
                    <td className="p-2">{Number(u.total_spent).toFixed(2)} د.أ</td>
                    <td className="p-2">
                      {isAdmin && <Badge>Admin</Badge>}
                      {!isAdmin && <span className="text-muted-foreground text-xs">مستخدم</span>}
                    </td>
                    <td className="p-2">
                      <Button size="sm" variant={isAdmin ? "outline" : "default"}
                        onClick={() => toggleAdmin.mutate({ userId: u.id, makeAdmin: !isAdmin })}>
                        {isAdmin ? "سحب Admin" : "منح Admin"}
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {(!usersQ.data || usersQ.data.length === 0) && (
                <tr><td colSpan={7} className="text-center p-6 text-muted-foreground">لا يوجد مستخدمون بعد</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
