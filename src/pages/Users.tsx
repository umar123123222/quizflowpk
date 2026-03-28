import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { OwnerSidebar } from "@/components/OwnerSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, Loader2, Users as UsersIcon, Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Teacher {
  id: string;
  full_name: string;
  email: string;
  contact_number: string | null;
  subject: string | null;
  created_at: string | null;
}

const Users = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    contact_number: "",
    subject: "",
  });

  const fetchTeachers = async () => {
    if (!user) return;

    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (!org) {
      setLoading(false);
      return;
    }

    // Get teacher links
    const { data: links } = await supabase
      .from("organization_teachers")
      .select("teacher_id, contact_number, subject, created_at")
      .eq("organization_id", org.id);

    if (!links || links.length === 0) {
      setTeachers([]);
      setLoading(false);
      return;
    }

    // Get profiles for names
    const teacherIds = links.map((l) => l.teacher_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", teacherIds);

    const profileMap = new Map(
      (profiles || []).map((p) => [p.id, p.full_name || "Unknown"])
    );

    // We can't query auth.users for emails from client, so we'll store email in metadata
    // For now, show what we have
    const teacherList: Teacher[] = links.map((link) => ({
      id: link.teacher_id,
      full_name: profileMap.get(link.teacher_id) || "Unknown",
      email: "", // Will be populated below
      contact_number: link.contact_number,
      subject: link.subject,
      created_at: link.created_at,
    }));

    setTeachers(teacherList);
    setLoading(false);
  };

  useEffect(() => {
    fetchTeachers();
  }, [user]);

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name.trim() || !formData.email.trim() || !formData.password.trim()) {
      toast({ title: "Error", description: "Name, email, and password are required.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke("invite-teacher", {
        body: {
          email: formData.email.trim(),
          full_name: formData.full_name.trim(),
          password: formData.password.trim(),
          contact_number: formData.contact_number.trim() || null,
          subject: formData.subject.trim() || null,
        },
      });

      if (response.error) throw response.error;
      if (response.data?.error) throw new Error(response.data.error);

      toast({ title: "Teacher added!", description: `${formData.full_name} has been added as a teacher.` });
      setFormData({ full_name: "", email: "", password: "", contact_number: "", subject: "" });
      setShowForm(false);
      setLoading(true);
      fetchTeachers();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to add teacher.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[hsl(var(--dashboard-bg))]">
        <OwnerSidebar />
        <div className="flex-1 flex flex-col">
          {/* Topbar */}
          <header className="h-14 flex items-center justify-between border-b border-[hsl(var(--dashboard-border))] bg-[hsl(var(--dashboard-bg))] px-5">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-white/60 hover:text-white/80" />
              <span className="inline-flex items-center rounded-full border border-[hsl(var(--dashboard-border))] bg-[hsl(var(--dashboard-card))] px-3 py-1 font-mono text-[10px] tracking-[0.15em] uppercase text-white/60">
                Org / Teachers
              </span>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--dashboard-gold))] font-mono text-[12px] font-bold text-[hsl(var(--dashboard-bg))]">
                {user?.user_metadata?.full_name
                  ? user.user_metadata.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase()
                  : "U"}
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1.5 font-mono text-[10px] tracking-wider uppercase text-white/45 transition-colors hover:text-white/70"
              >
                <LogOut className="h-3 w-3" />
                Sign out
              </button>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6 md:p-10">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="font-serif text-3xl md:text-4xl font-bold text-white/95">Teachers</h1>
                <p className="font-mono text-[11px] tracking-[0.15em] uppercase text-white/50 mt-2">
                  Manage teachers in your organization
                </p>
              </div>
              <button
                onClick={() => setShowForm(!showForm)}
                className="flex items-center gap-2 rounded-md border border-[hsl(var(--dashboard-gold)/0.4)] bg-[hsl(var(--dashboard-gold)/0.1)] px-4 py-2 font-mono text-[11px] tracking-wider uppercase text-[hsl(var(--dashboard-gold))] transition-colors hover:bg-[hsl(var(--dashboard-gold)/0.2)]"
              >
                {showForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                {showForm ? "Cancel" : "Add Teacher"}
              </button>
            </div>

            {/* Add Teacher Form */}
            {showForm && (
              <div className="rounded-lg border border-[hsl(var(--dashboard-border))] bg-[hsl(var(--dashboard-card))] p-6 mb-8">
                <div className="h-[2px] bg-[hsl(var(--dashboard-gold))] -mt-6 -mx-6 mb-6 rounded-t-lg" />
                <h2 className="font-serif text-lg font-bold text-white/92 mb-4">Add New Teacher</h2>
                <form onSubmit={handleAddTeacher} className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block font-mono text-[10px] tracking-wider uppercase text-white/60 mb-1.5">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className="w-full rounded-md border border-[hsl(var(--dashboard-border))] bg-[hsl(var(--dashboard-bg))] px-3 py-2 text-sm text-white/90 placeholder:text-white/50 focus:border-[hsl(var(--dashboard-gold)/0.5)] focus:outline-none"
                      placeholder="John Doe"
                      maxLength={100}
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-[10px] tracking-wider uppercase text-white/60 mb-1.5">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full rounded-md border border-[hsl(var(--dashboard-border))] bg-[hsl(var(--dashboard-bg))] px-3 py-2 text-sm text-white/90 placeholder:text-white/50 focus:border-[hsl(var(--dashboard-gold)/0.5)] focus:outline-none"
                      placeholder="teacher@example.com"
                      maxLength={255}
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-[10px] tracking-wider uppercase text-white/60 mb-1.5">
                      Password *
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full rounded-md border border-[hsl(var(--dashboard-border))] bg-[hsl(var(--dashboard-bg))] px-3 py-2 text-sm text-white/90 placeholder:text-white/50 focus:border-[hsl(var(--dashboard-gold)/0.5)] focus:outline-none"
                      placeholder="Initial password"
                      minLength={6}
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-[10px] tracking-wider uppercase text-white/60 mb-1.5">
                      Contact Number
                    </label>
                    <input
                      type="text"
                      value={formData.contact_number}
                      onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                      className="w-full rounded-md border border-[hsl(var(--dashboard-border))] bg-[hsl(var(--dashboard-bg))] px-3 py-2 text-sm text-white/90 placeholder:text-white/50 focus:border-[hsl(var(--dashboard-gold)/0.5)] focus:outline-none"
                      placeholder="+1234567890"
                      maxLength={20}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-mono text-[10px] tracking-wider uppercase text-white/60 mb-1.5">
                      Subject They Teach
                    </label>
                    <input
                      type="text"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full rounded-md border border-[hsl(var(--dashboard-border))] bg-[hsl(var(--dashboard-bg))] px-3 py-2 text-sm text-white/90 placeholder:text-white/50 focus:border-[hsl(var(--dashboard-gold)/0.5)] focus:outline-none"
                      placeholder="Mathematics, Physics, etc."
                      maxLength={100}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex items-center gap-2 rounded-md bg-[hsl(var(--dashboard-gold))] px-5 py-2 font-mono text-[11px] tracking-wider uppercase text-[hsl(var(--dashboard-bg))] font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      {submitting ? "Adding..." : "Add Teacher"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Teachers Table */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-white/50" />
              </div>
            ) : teachers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[hsl(var(--dashboard-border))] bg-[hsl(var(--dashboard-card))] mb-4">
                  <UsersIcon className="h-6 w-6 text-white/40" />
                </div>
                <p className="text-sm text-white/70 mb-1">No teachers yet</p>
                <p className="font-mono text-[10px] text-white/45">Add your first teacher to get started</p>
              </div>
            ) : (
              <div className="rounded-lg border border-[hsl(var(--dashboard-border))] bg-[hsl(var(--dashboard-card))] overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-[hsl(var(--dashboard-border))] hover:bg-transparent">
                      <TableHead className="font-mono text-[10px] tracking-wider uppercase text-white/60">Full Name</TableHead>
                      <TableHead className="font-mono text-[10px] tracking-wider uppercase text-white/60">Contact Number</TableHead>
                      <TableHead className="font-mono text-[10px] tracking-wider uppercase text-white/60">Subject</TableHead>
                      <TableHead className="font-mono text-[10px] tracking-wider uppercase text-white/60 text-right">Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teachers.map((teacher) => (
                      <TableRow
                        key={teacher.id}
                        className="border-[hsl(var(--dashboard-border))] hover:bg-[hsl(var(--dashboard-gold)/0.03)]"
                      >
                        <TableCell className="text-sm text-white/85 font-medium">
                          {teacher.full_name}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-white/70">
                          {teacher.contact_number || "—"}
                        </TableCell>
                        <TableCell className="text-xs text-white/70">
                          {teacher.subject || "—"}
                        </TableCell>
                        <TableCell className="font-mono text-[11px] text-white/60 text-right">
                          {teacher.created_at
                            ? new Date(teacher.created_at).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Users;
