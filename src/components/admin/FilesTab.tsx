import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { Upload, Loader2, FileText, FileType2, Image as ImageIcon, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { validateFile, ALLOWED_MIME } from "@/lib/validators";
import { Button } from "@/components/ui/button";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FileRow {
  id: string;
  file_path: string;
  file_name: string;
  file_type: string | null;
  size: number | null;
  created_at: string;
}

function fileIcon(type: string | null, name: string) {
  const t = (type || "").toLowerCase();
  const n = name.toLowerCase();
  if (t.includes("pdf") || n.endsWith(".pdf")) return <FileText className="h-4 w-4 text-destructive" />;
  if (t.includes("presentation") || n.endsWith(".ppt") || n.endsWith(".pptx"))
    return <FileType2 className="h-4 w-4 text-accent" />;
  if (t.startsWith("image/")) return <ImageIcon className="h-4 w-4 text-highlight" />;
  return <FileText className="h-4 w-4 text-muted-foreground" />;
}

export function FilesTab() {
  const [items, setItems] = useState<FileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [drag, setDrag] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("files")
      .select("id, file_path, file_name, file_type, size, created_at")
      .order("created_at", { ascending: false });
    if (error) toast.error("Failed to load files");
    else setItems((data as FileRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const upload = useCallback(async (files: File[]) => {
    if (!files.length) return;
    setUploading(true);
    const { data: userData } = await supabase.auth.getUser();
    for (const f of files) {
      const err = validateFile(f);
      if (err) {
        toast.error(`${f.name}: ${err}`);
        continue;
      }
      const ext = f.name.split(".").pop() ?? "bin";
      const path = `library/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("attachments").upload(path, f, {
        contentType: f.type,
        upsert: false,
      });
      if (upErr) {
        toast.error(`Upload failed: ${f.name}`);
        continue;
      }
      const { error } = await supabase.from("files").insert({
        file_path: path,
        file_name: f.name,
        file_type: f.type,
        size: f.size,
        uploaded_by: userData.user?.id ?? null,
      });
      if (error) {
        toast.error(`Saved upload failed: ${f.name}`);
        await supabase.storage.from("attachments").remove([path]);
      }
    }
    setUploading(false);
    toast.success("Upload complete");
    load();
  }, []);

  const remove = async (row: FileRow) => {
    await supabase.storage.from("attachments").remove([row.file_path]);
    const { error } = await supabase.from("files").delete().eq("id", row.id);
    if (error) toast.error("Delete failed");
    else {
      toast.success("Deleted");
      load();
    }
  };

  const url = (path: string) => supabase.storage.from("attachments").getPublicUrl(path).data.publicUrl;

  return (
    <div className="space-y-6">
      <section
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          upload(Array.from(e.dataTransfer.files));
        }}
        className={cn(
          "rounded-2xl border-2 border-dashed p-8 text-center transition-colors",
          drag ? "border-highlight bg-highlight-soft" : "border-border bg-card",
        )}
      >
        <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-2 text-sm font-medium">Drop files here, or</p>
        <label className="mt-3 inline-flex">
          <input
            type="file"
            multiple
            accept={ALLOWED_MIME.join(",")}
            className="hidden"
            onChange={(e) => upload(Array.from(e.target.files ?? []))}
          />
          <span className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            {uploading ? <Loader2 className="inline h-4 w-4 animate-spin" /> : "Choose files"}
          </span>
        </label>
        <p className="mt-2 text-xs text-muted-foreground">Max 10 MB · PDF, PPT, DOC, images</p>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <h3 className="mb-4 text-base font-semibold">File library</h3>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No files yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-2 rounded-xl border border-border p-3">
                <div className="flex min-w-0 items-center gap-2">
                  {fileIcon(f.file_type, f.file_name)}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{f.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {f.size ? `${(f.size / 1024).toFixed(1)} KB` : ""} · {format(new Date(f.created_at), "PP")}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button asChild variant="ghost" size="icon">
                    <a href={url(f.file_path)} target="_blank" rel="noreferrer" download aria-label="Download">
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                  <ConfirmDelete
                    onConfirm={() => remove(f)}
                    title="Delete file?"
                    description="The file will be permanently removed from storage."
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
