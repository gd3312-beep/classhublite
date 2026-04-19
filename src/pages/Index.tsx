import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Calendar } from "@/components/Calendar";
import { AnnouncementsPanel, AnnouncementLite } from "@/components/AnnouncementsPanel";
import { DateDeadlinesModal, DeadlineDetail, AttachmentLite } from "@/components/DateDeadlinesModal";
import { toast } from "sonner";

interface DeadlineRow {
  id: string;
  due_date: string;
}

interface DeadlineDetailRow {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  deadline_attachments: AttachmentLite[];
}

const Index = () => {
  const [calendarDeadlines, setCalendarDeadlines] = useState<DeadlineRow[]>([]);
  const [deadlineDetailsByDate, setDeadlineDetailsByDate] = useState<Record<string, DeadlineDetail[]>>({});
  const [announcements, setAnnouncements] = useState<AnnouncementLite[]>([]);
  const [loadingD, setLoadingD] = useState(true);
  const [loadingA, setLoadingA] = useState(true);
  const [loadingSelectedDate, setLoadingSelectedDate] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    document.title = "ClassHub Lite — Class deadlines & announcements";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Track class deadlines and announcements in one minimal hub.");
  }, []);

  useEffect(() => {
    let active = true;

    void (async () => {
      const { data, error } = await supabase
        .from("deadlines")
        .select("id, due_date")
        .order("due_date", { ascending: true });

      if (!active) return;

      if (error) {
        toast.error("Failed to load deadlines");
      } else {
        setCalendarDeadlines((data as DeadlineRow[]) ?? []);
      }
      setLoadingD(false);
    })();

    void (async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("id, title, body, pinned, created_at")
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false });

      if (!active) return;

      if (error) {
        toast.error("Failed to load announcements");
      } else {
        setAnnouncements((data as AnnouncementLite[]) ?? []);
      }
      setLoadingA(false);
    })();

    return () => {
      active = false;
    };
  }, []);

  const selectedDateKey = useMemo(
    () => (selectedDate ? format(selectedDate, "yyyy-MM-dd") : null),
    [selectedDate],
  );

  const deadlineDateSet = useMemo(
    () => new Set(calendarDeadlines.map((deadline) => deadline.due_date)),
    [calendarDeadlines],
  );

  useEffect(() => {
    if (!selectedDateKey) {
      setLoadingSelectedDate(false);
      return;
    }

    if (deadlineDetailsByDate[selectedDateKey]) {
      setLoadingSelectedDate(false);
      return;
    }

    if (!deadlineDateSet.has(selectedDateKey)) {
      setDeadlineDetailsByDate((current) => ({ ...current, [selectedDateKey]: [] }));
      setLoadingSelectedDate(false);
      return;
    }

    let active = true;
    setLoadingSelectedDate(true);

    void (async () => {
      const { data, error } = await supabase
        .from("deadlines")
        .select("id, title, description, due_date, deadline_attachments(id, file_path, file_name, file_type)")
        .eq("due_date", selectedDateKey)
        .order("title", { ascending: true });

      if (!active) return;

      if (error) {
        toast.error("Failed to load deadlines");
      } else {
        setDeadlineDetailsByDate((current) => ({
          ...current,
          [selectedDateKey]: ((data as DeadlineDetailRow[]) ?? []).map((deadline) => ({
            id: deadline.id,
            title: deadline.title,
            description: deadline.description,
            due_date: deadline.due_date,
            attachments: deadline.deadline_attachments,
          })),
        }));
      }

      setLoadingSelectedDate(false);
    })();

    return () => {
      active = false;
    };
  }, [deadlineDateSet, deadlineDetailsByDate, selectedDateKey]);

  const dayDeadlines: DeadlineDetail[] = useMemo(() => {
    if (!selectedDateKey) return [];
    return deadlineDetailsByDate[selectedDateKey] ?? [];
  }, [deadlineDetailsByDate, selectedDateKey]);

  const storageUrl = (path: string) => {
    const { data } = supabase.storage.from("attachments").getPublicUrl(path);
    return data.publicUrl;
  };

  const top5 = announcements.slice(0, 5);

  return (
    <div className="min-h-screen bg-background">
      <Navbar title="Dashboard" />
      <main className="container px-4 py-6 sm:py-10">
        <section className="mb-6 sm:mb-8">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">Stay on top of your class deadlines and updates.</p>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-10">
          <div className="lg:col-span-7">
            <Calendar
              deadlines={calendarDeadlines}
              loading={loadingD}
              onSelectDate={setSelectedDate}
            />
          </div>
          <div className="lg:col-span-3">
            <AnnouncementsPanel
              announcements={top5}
              allAnnouncements={announcements}
              loading={loadingA}
            />
          </div>
        </div>
      </main>

      <DateDeadlinesModal
        date={selectedDate}
        deadlines={dayDeadlines}
        loading={loadingSelectedDate}
        onClose={() => setSelectedDate(null)}
        storageUrl={storageUrl}
      />
    </div>
  );
};

export default Index;
