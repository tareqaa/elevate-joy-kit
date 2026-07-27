import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { LayoutDashboard, Package, Users, Settings, LogOut, Store, User, Search } from "lucide-react";

type OrderHit = { id: string; order_number: string; customer_name: string | null; total_jod: number; status: string };
type UserHit = { id: string; username: string | null; full_name: string | null; email: string | null };

export function AdminCommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [orders, setOrders] = useState<OrderHit[]>([]);
  const [users, setUsers] = useState<UserHit[]>([]);

  useEffect(() => {
    if (!open) return;
    const term = q.trim();
    if (!term) { setOrders([]); setUsers([]); return; }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      const [o, u] = await Promise.all([
        supabase.from("orders")
          .select("id, order_number, customer_name, total_jod, status")
          .or(`order_number.ilike.%${term}%,customer_name.ilike.%${term}%,customer_whatsapp.ilike.%${term}%`)
          .limit(6),
        supabase.from("profiles")
          .select("id, username, full_name, email")
          .or(`username.ilike.%${term}%,full_name.ilike.%${term}%,email.ilike.%${term}%`)
          .limit(6),
      ]);
      if (ctrl.signal.aborted) return;
      setOrders(o.data ?? []);
      setUsers(u.data ?? []);
    }, 180);
    return () => { ctrl.abort(); clearTimeout(t); };
  }, [q, open]);

  const go = (to: string) => { onOpenChange(false); setQ(""); navigate({ to: to as never }); };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="ابحث عن طلب، مستخدم، أو صفحة… (Ctrl+K)" value={q} onValueChange={setQ} />
      <CommandList>
        <CommandEmpty>لا نتائج.</CommandEmpty>

        {orders.length > 0 && (
          <CommandGroup heading="الطلبات">
            {orders.map((o) => (
              <CommandItem key={o.id} value={`order-${o.id}`} onSelect={() => go("/admin/orders")}>
                <Package className="mr-2 h-4 w-4 text-cyan-400" />
                <div className="flex-1">
                  <div className="font-semibold" dir="ltr">{o.order_number}</div>
                  <div className="text-xs text-muted-foreground">{o.customer_name ?? "زائر"} — {Number(o.total_jod).toFixed(2)} د.أ</div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 uppercase">{o.status}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {users.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="المستخدمون">
              {users.map((u) => (
                <CommandItem key={u.id} value={`user-${u.id}`} onSelect={() => go("/admin/users")}>
                  <User className="mr-2 h-4 w-4 text-cyan-400" />
                  <div className="flex-1">
                    <div className="font-semibold">{u.full_name || u.username || u.email}</div>
                    <div className="text-xs text-muted-foreground" dir="ltr">{u.username ? "@" + u.username : u.email}</div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading="التنقّل">
          <CommandItem onSelect={() => go("/admin")}><LayoutDashboard className="mr-2 h-4 w-4" /> لوحة التحكم</CommandItem>
          <CommandItem onSelect={() => go("/admin/orders")}><Package className="mr-2 h-4 w-4" /> الطلبات</CommandItem>
          <CommandItem onSelect={() => go("/admin/users")}><Users className="mr-2 h-4 w-4" /> المستخدمون</CommandItem>
          <CommandItem onSelect={() => go("/")}><Store className="mr-2 h-4 w-4" /> المتجر</CommandItem>
          <CommandItem onSelect={() => go("/account")}><Settings className="mr-2 h-4 w-4" /> حسابي</CommandItem>
        </CommandGroup>

        <CommandSeparator />
        <CommandGroup heading="إجراءات">
          <CommandItem onSelect={async () => { await supabase.auth.signOut(); go("/auth"); }}>
            <LogOut className="mr-2 h-4 w-4 text-red-400" /> تسجيل الخروج
          </CommandItem>
          <CommandItem onSelect={() => { setQ(""); }}>
            <Search className="mr-2 h-4 w-4" /> مسح البحث
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
