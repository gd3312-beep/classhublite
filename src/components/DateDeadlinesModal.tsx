import { format } from "date-fns";
import { FileText, FileType2, Image as ImageIcon, Download, Calendar as CalendarIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface AttachmentLite {
  id: string;
  file_path: string;
  file_name: string;
  file_type: string | null;
}

export interface DeadlineDetail {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  attachments?: AttachmentLite[];
}

interface DateDeadlinesModalProps {
  date: Date | null;
  deadlines: DeadlineDetail[];
  loading?: boolean;
  onClose: () => void;
  storageUrl: (path: string) => string;
}

function fileIcon(type: string | null, name: string) {
  const t = (type || "").toLowerCase();
  const n = name.toLowerCase();
  if (t.includes("pdf") || n.endsWith(".pdf")) return <FileText className="h-5 w-5 text-destructive" />;
  if (t.includes("presentation") || n.endsWith(".ppt") || n.endsWith(".pptx"))
    return <FileType2 className="h-5 w-5 text-accent" />;
  if (t.startsWith("image/")) return <ImageIcon className="h-5 w-5 text-highlight" />;
  return <FileText className="h-5 w-5 text-muted-foreground" />;
}

export function DateDeadlinesModal({ date, deadlines, loading, onClose, storageUrl }: DateDeadlinesModalProps) {
  return (
    <Dialog open={!!date} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-highlight" />
            {date && format(date, "EEEE, MMMM d, yyyy")}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading deadlines…</div>
        ) : deadlines.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">No deadlines on this day.</div>
        ) : (
          <div className="space-y-3">
            {deadlines.map((d) => (
              <article key={d.id} className="rounded-xl border border-border bg-secondary/40 p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold leading-snug">{d.title}</h3>
                  <Badge variant="outline" className="border-brown text-brown">Due</Badge>
                </div>
                {d.description && (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{d.description}</p>
                )}
                {d.attachments && d.attachments.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {d.attachments.map((a) => (
                      <li key={a.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card p-2">
                        <div className="flex min-w-0 items-center gap-2">
                          {fileIcon(a.file_type, a.file_name)}
                          <span className="truncate text-sm">{a.file_name}</span>
                        </div>
                        <Button asChild size="sm" variant="ghost">
                          <a href={storageUrl(a.file_path)} target="_blank" rel="noreferrer" download>
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
