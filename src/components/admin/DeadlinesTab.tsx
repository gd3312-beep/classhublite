import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Pencil, Trash2, Plus, Upload, Loader2, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { deadlineSchema, validateFile } from "@/lib/validators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { toast } from "sonner";

type FormValues = z.infer<typeof deadlineSchema>;

interface Attachment {
  id: string;
  file_path: string;
  file_name: string;
  file_type: string | null;
}

interface Deadline {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  deadline_attachments: Attachment[];
}

export function DeadlinesTab() {
  const [items, setItems] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Deadline | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(deadlineSchema),
    defaultValues: { title: "", description: "", due_date: "" },
  });

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("deadlines")
      .select("id, title, description, due_date, deadline_attachments(id, file_path, file_name, file_type)")
      .order("due_date", { ascending: true });
    if (error) toast.error("Failed to load deadlines");
    else setItems((data as Deadline[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(d: Deadline | null) {
    setEditing(d);
    setFiles([]);
    if (d) form.reset({ title: d.title, description: d.description ?? "", due_date: d.due_date });
    else form.reset({ title: "", description: "", due_date: "" });
  }

  async function uploadAttachments(deadlineId: string) {
    const { data: userData } = await supabase.auth.getUser();
    for (const f of files) {
      const err = validateFile(f);
      if (err) {
        toast.error(`${f.name}: ${err}`);
        continue;
      }
      const ext = f.name.split(".").pop() ?? "bin";
      const path = `deadlines/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("attachments").upload(path, f, {
        contentType: f.type,
        upsert: false,
      });
      if (upErr) {
        toast.error(`Upload failed: ${f.name}`);
        continue;
      }
      await supabase.from("deadline_attachments").insert({
        deadline_id: deadlineId,
        file_path: path,
        file_name: f.name,
        file_type: f.type,
        file_size: f.size,
      });
    }
  }

  const onSubmit = async (values: FormValues) => {
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const payload = {
      title: values.title,
      description: values.description || null,
      due_date: values.due_date,
      created_by: userData.user?.id ?? null,
    };

    if (editing) {
      const { error } = await supabase.from("deadlines").update(payload).eq("id", editing.id);
      if (error) {
        toast.error("Update failed");
        setSaving(false);
        return;
      }
      if (files.length) await uploadAttachments(editing.id);
      toast.success("Deadline updated");
    } else {
      const { data, error } = await supabase.from("deadlines").insert(payload).select().single();
      if (error || !data) {
        toast.error("Create failed");
        setSaving(false);
        return;
      }
      if (files.length) await uploadAttachments(data.id);
      toast.success("Deadline created");
    }
    setSaving(false);
    setEditing(null);
    setFiles([]);
    form.reset({ title: "", description: "", due_date: "" });
    load();
  };

  const remove = async (d: Deadline) => {
    // Remove attachments from storage first
    if (d.deadline_attachments.length) {
      await supabase.storage.from("attachments").remove(d.deadline_attachments.map((a) => a.file_path));
    }
    const { error } = await supabase.from("deadlines").delete().eq("id", d.id);
    if (error) toast.error("Delete failed");
    else {
      toast.success("Deleted");
      load();
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <h3 className="mb-4 text-base font-semibold">{editing ? "Edit deadline" : "Add deadline"}</h3>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" maxLength={100} {...form.register("title")} />
            {form.formState.errors.title && (
              <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={3} maxLength={1000} {...form.register("description")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="due_date">Due date</Label>
            <Input id="due_date" type="date" {...form.register("due_date")} />
            {form.formState.errors.due_date && (
              <p className="text-xs text-destructive">{form.formState.errors.due_date.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="files">Attachments (PDF, PPT, DOC, images, ≤10MB)</Label>
            <Input
              id="files"
              type="file"
              multiple
              accept=".pdf,.ppt,.pptx,.doc,.docx,image/*"
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            />
            {files.length > 0 && (
              <p className="text-xs text-muted-foreground">{files.length} file(s) selected</p>
            )}
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
        <h3 className="mb-4 text-base font-semibold">All deadlines</h3>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No deadlines yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((d) => (
              <li key={d.id} className="flex items-start justify-between gap-2 rounded-xl border border-border p-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{d.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(d.due_date), "PP")} · {d.deadline_attachments.length} file(s)
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon" onClick={() => startEdit(d)} aria-label="Edit">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <ConfirmDelete
                    onConfirm={() => remove(d)}
                    title="Delete deadline?"
                    description="This will also delete its attached files. This action cannot be undone."
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
