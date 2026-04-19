import { useState } from "react";
import { format } from "date-fns";
import { Pin, Megaphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface AnnouncementLite {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  created_at: string;
}

interface Props {
  announcements: AnnouncementLite[];
  loading?: boolean;
  allAnnouncements: AnnouncementLite[];
}

function AnnouncementCard({ a }: { a: AnnouncementLite }) {
  return (
    <article className="rounded-xl border border-border bg-card p-4 shadow-soft transition-shadow hover:shadow-card">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold leading-snug">{a.title}</h3>
        {a.pinned && (
          <Badge className="bg-highlight text-highlight-foreground hover:bg-highlight/90 gap-1">
            <Pin className="h-3 w-3" /> Pinned
          </Badge>
        )}
      </div>
      <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">{a.body}</p>
      <p className="mt-3 text-xs text-muted-foreground/70">{format(new Date(a.created_at), "PP")}</p>
    </article>
  );
}

export function AnnouncementsPanel({ announcements, loading, allAnnouncements }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <aside className="rounded-2xl border border-border bg-card/50 p-4 shadow-card sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight sm:text-xl">
          <Megaphone className="h-5 w-5 text-brown" />
          Announcements
        </h2>
        {allAnnouncements.length > 5 && (
          <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
            View all
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
          No announcements yet.
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => <AnnouncementCard key={a.id} a={a} />)}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>All announcements</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {allAnnouncements.map((a) => <AnnouncementCard key={a.id} a={a} />)}
          </div>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
