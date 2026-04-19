import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeadlinesTab } from "@/components/admin/DeadlinesTab";
import { AnnouncementsTab } from "@/components/admin/AnnouncementsTab";
import { FilesTab } from "@/components/admin/FilesTab";
import { AdminsTab } from "@/components/admin/AdminsTab";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const Admin = () => {
  const { isAdmin, loading } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    document.title = "Admin Panel — ClassHub Lite";
    if (!loading && !isAdmin) {
      toast.error("Admin access required");
      nav("/");
    }
  }, [loading, isAdmin, nav]);

  if (loading || !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-highlight border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar title="Admin Panel" />
      <main className="container px-4 py-6 sm:py-10">
        <h1 className="mb-6 text-2xl font-bold tracking-tight sm:text-3xl">Admin Panel</h1>
        <Tabs defaultValue="deadlines" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:inline-flex sm:grid-cols-4">
            <TabsTrigger value="deadlines">Deadlines</TabsTrigger>
            <TabsTrigger value="announcements">Announcements</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger value="admins">Admins</TabsTrigger>
          </TabsList>
          <TabsContent value="deadlines" className="mt-6">
            <DeadlinesTab />
          </TabsContent>
          <TabsContent value="announcements" className="mt-6">
            <AnnouncementsTab />
          </TabsContent>
          <TabsContent value="files" className="mt-6">
            <FilesTab />
          </TabsContent>
          <TabsContent value="admins" className="mt-6">
            <AdminsTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
