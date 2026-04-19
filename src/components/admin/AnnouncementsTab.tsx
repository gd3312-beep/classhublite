import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Pencil, Plus, Loader2, Pin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { announcementSchema } from "@/lib/validators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { toast } from "sonner";

type FormValues = z.infer<typeof announcementSchema>;

interface Announcement {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  created_at: string;
}

export function AnnouncementsTab() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [saving, setSaving] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(announcementSchema),
    defaultValues: { title: "", body: "", pinned: false },
  });

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("announcements")
      .select("id, title, body, pinned, created_at")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) toast.error("Failed to load announcements");
    else setItems((data as Announcement[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(a: Announcement | null) {
    setEditing(a);
    if (a) form.reset({ title: a.title, body: a.body, pinned: a.pinned });
    else form.reset({ title: "", body: "", pinned: false });
  }

  const onSubmit = async (values: FormValues) => {
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const payload = { ...values, created_by: userData.user?.id ?? null };

    if (editing) {
      const { error } = await supabase.from("announcements").update(payload).eq("id", editing.id);
      if (error) toast.error("Update failed");
      else toast.success("Updated");
    } else {
      const { error } = await supabase.from("announcements").insert(payload);
      if (error) toast.error("Create failed");
      else toast.success("Created");
    }
    setSaving(false);
    startEdit(null);
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) toast.error("Delete failed");
    else {
      toast.success("Deleted");
      load();
    }
  };

  const pinned = form.watch("pinned");

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <h3 className="mb-4 text-base font-semibold">{editing ? "Edit announcement" : "Add announcement"}</h3>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" maxLength={100} {...form.register("title")} />
            {form.formState.errors.title && (
              <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="body">Body</Label>
            <Textarea id="body" rows={5} maxLength={2000} {...form.register("body")} />
            {form.formState.errors.body && (
              <p className="text-xs text-destructive">{form.formState.errors.body.message}</p>
            )}
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/40 p-3">
            <div>
              <p className="text-sm font-medium">Pinned</p>
              <p className="text-xs text-muted-foreground">Pinned items appear at the top.</p>
            </div>
            <Switch
              checked={pinned}
              onCheckedChange={(v) => form.setValue("pinned", v)}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {editing ? "Update" : "Create"}
            </Button>
            {editing && (
              <Button type="button" variant="ghost" onClick={() => startEdit(null)}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <h3 className="mb-4 text-base font-semibold">All announcements</h3>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No announcements yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((a) => (
              <li key={a.id} className="rounded-xl border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">{a.title}</p>
                      {a.pinned && (
                        <Badge className="bg-highlight text-highlight-foreground gap-1">
                          <Pin className="h-3 w-3" /> Pinned
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{a.body}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground/70">{format(new Date(a.created_at), "PP")}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="icon" onClick={() => startEdit(a)} aria-label="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <ConfirmDelete
                      onConfirm={() => remove(a.id)}
                      title="Delete announcement?"
                      description="This action cannot be undone."
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
