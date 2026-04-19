import { useEffect, useState } from "react";
import { Loader2, Shield, ShieldOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface UserRow {
  id: string;
  email: string | null;
  isAdmin: boolean;
}

type ProfileRow = Pick<Tables<"profiles">, "email" | "id">;
type RoleRow = Pick<Tables<"user_roles">, "role" | "user_id">;

export function AdminsTab() {
  const { user } = useAuth();
  const [items, setItems] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [{ data: profiles, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
      supabase.from("profiles").select("id, email"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    if (pErr || rErr) {
      toast.error("Failed to load users");
      setLoading(false);
      return;
    }
    const adminSet = new Set(
      ((roles ?? []) as RoleRow[])
        .filter((role) => role.role === "admin")
        .map((role) => role.user_id),
    );
    setItems(
      ((profiles ?? []) as ProfileRow[]).map((profile) => ({
        id: profile.id,
        email: profile.email,
        isAdmin: adminSet.has(profile.id),
      })),
    );
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const toggleAdmin = async (row: UserRow) => {
    setBusy(row.id);
    if (row.isAdmin) {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", row.id).eq("role", "admin");
      if (error) toast.error("Failed to demote");
      else toast.success("Demoted to user");
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: row.id, role: "admin" });
      if (error) toast.error("Failed to promote");
      else toast.success("Promoted to admin");
    }
    setBusy(null);
    load();
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <h3 className="mb-4 text-base font-semibold">Admin users</h3>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No users yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((u) => (
            <li key={u.id} className="flex items-center justify-between gap-2 rounded-xl border border-border p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{u.email ?? u.id}</p>
                {u.isAdmin && <Badge className="mt-1 bg-highlight text-highlight-foreground">Admin</Badge>}
              </div>
              <Button
                variant={u.isAdmin ? "outline" : "default"}
                size="sm"
                disabled={busy === u.id || u.id === user?.id}
                onClick={() => toggleAdmin(u)}
                title={u.id === user?.id ? "You can't change your own role" : ""}
              >
                {busy === u.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : u.isAdmin ? (
                  <>
                    <ShieldOff className="h-4 w-4" /> Demote
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4" /> Promote
                  </>
                )}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
