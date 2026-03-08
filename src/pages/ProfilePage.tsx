import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { User, Mail, Phone, MapPin, FileText, Trophy, Clock, CalendarDays, Pencil, Save, X } from "lucide-react";

type Profile = {
  id: string;
  display_name: string;
  bio: string;
  phone: string;
  location: string;
  avatar_url: string;
  created_at: string;
};

type QuizAttempt = {
  id: string;
  score: number;
  total_questions: number;
  time_taken_seconds: number;
  created_at: string;
  quiz: { title: string; topic: string } | null;
};

const ProfilePage = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ display_name: "", bio: "", phone: "", location: "" });
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth", { state: { from: "/profile" } });
        return;
      }
      setEmail(session.user.email || "");

      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (p) {
        const prof = p as Profile;
        setProfile(prof);
        setForm({
          display_name: prof.display_name || "",
          bio: prof.bio || "",
          phone: prof.phone || "",
          location: prof.location || "",
        });
      }

      const { data: att } = await supabase
        .from("quiz_attempts")
        .select("id, score, total_questions, time_taken_seconds, created_at, quiz:quizzes(title, topic)")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (att) {
        setAttempts(
          att.map((a: any) => ({
            ...a,
            quiz: Array.isArray(a.quiz) ? a.quiz[0] || null : a.quiz,
          }))
        );
      }

      setLoading(false);
    };
    load();
  }, [navigate]);

  const handleSave = async () => {
    if (!profile) return;
    if (!form.display_name.trim()) {
      toast({ title: "Display name is required", variant: "destructive" });
      return;
    }
    setSaving(true);

    // Ensure we have an active session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setSaving(false);
      toast({ title: "Session expired", description: "Please sign in again.", variant: "destructive" });
      navigate("/auth", { state: { from: "/profile" } });
      return;
    }

    const updateData = {
      display_name: form.display_name.trim().slice(0, 100),
      bio: form.bio.trim().slice(0, 500),
      phone: form.phone.trim().slice(0, 20),
      location: form.location.trim().slice(0, 100),
    };

    const { data, error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", profile.id)
      .select()
      .single();

    setSaving(false);
    if (error) {
      console.error("Profile save error:", error);
      toast({ title: "Error saving profile", description: error.message, variant: "destructive" });
    } else if (data) {
      setProfile(data as Profile);
      setEditing(false);
      toast({ title: "Profile updated!" });
    } else {
      toast({ title: "No changes saved", description: "Please try again.", variant: "destructive" });
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-32 text-muted-foreground">Loading...</div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-4xl px-6 py-12">
        {/* Profile Card */}
        <div className="mb-10 rounded-lg border border-border bg-card p-6 md:p-8">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
              My Profile
            </h1>
            {!editing && (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" /> Edit
              </Button>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Display Name */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" /> Display Name
              </Label>
              {editing ? (
                <Input
                  value={form.display_name}
                  onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                  maxLength={100}
                />
              ) : (
                <p className="text-sm font-medium text-foreground">{profile?.display_name || "—"}</p>
              )}
            </div>

            {/* Email (read-only) */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" /> Email
              </Label>
              <p className="text-sm text-foreground">{email}</p>
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" /> Phone
              </Label>
              {editing ? (
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  maxLength={20}
                  placeholder="Your phone number"
                />
              ) : (
                <p className="text-sm text-foreground">{profile?.phone || "—"}</p>
              )}
            </div>

            {/* Location */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" /> Location
              </Label>
              {editing ? (
                <Input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  maxLength={100}
                  placeholder="City, Country"
                />
              ) : (
                <p className="text-sm text-foreground">{profile?.location || "—"}</p>
              )}
            </div>

            {/* Bio - full width */}
            <div className="space-y-1.5 md:col-span-2">
              <Label className="flex items-center gap-2 text-muted-foreground">
                <FileText className="h-4 w-4" /> Bio
              </Label>
              {editing ? (
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  maxLength={500}
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Tell us about yourself..."
                />
              ) : (
                <p className="text-sm text-foreground">{profile?.bio || "—"}</p>
              )}
            </div>

            {/* Member since */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-muted-foreground">
                <CalendarDays className="h-4 w-4" /> Member Since
              </Label>
              <p className="text-sm text-foreground">
                {profile?.created_at ? new Date(profile.created_at).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" }) : "—"}
              </p>
            </div>
          </div>

          {editing && (
            <div className="mt-6 flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => setEditing(false)}>
                <X className="h-4 w-4" /> Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          )}
        </div>

        {/* Quiz Activity */}
        <div className="rounded-lg border border-border bg-card p-6 md:p-8">
          <h2 className="mb-6 text-xl font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
            <Trophy className="mr-2 inline h-5 w-5 text-accent" />
            Quiz Activity
          </h2>

          {attempts.length === 0 ? (
            <p className="text-sm text-muted-foreground">You haven't attempted any quizzes yet. <a href="/quizzes" className="text-accent hover:underline">Browse quizzes →</a></p>
          ) : (
            <>
              {/* Stats summary */}
              <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="rounded-md border border-border bg-muted/30 p-4 text-center">
                  <p className="text-2xl font-bold text-foreground">{attempts.length}</p>
                  <p className="text-xs text-muted-foreground">Quizzes Taken</p>
                </div>
                <div className="rounded-md border border-border bg-muted/30 p-4 text-center">
                  <p className="text-2xl font-bold text-accent">
                    {attempts.length > 0
                      ? Math.round(attempts.reduce((a, b) => a + (b.score / b.total_questions) * 100, 0) / attempts.length)
                      : 0}%
                  </p>
                  <p className="text-xs text-muted-foreground">Avg Score</p>
                </div>
                <div className="rounded-md border border-border bg-muted/30 p-4 text-center">
                  <p className="text-2xl font-bold text-foreground">
                    {Math.max(...attempts.map((a) => Math.round((a.score / a.total_questions) * 100)))}%
                  </p>
                  <p className="text-xs text-muted-foreground">Best Score</p>
                </div>
                <div className="rounded-md border border-border bg-muted/30 p-4 text-center">
                  <p className="text-2xl font-bold text-foreground">
                    {attempts.reduce((a, b) => a + b.score, 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Correct</p>
                </div>
              </div>

              {/* Attempt list */}
              <div className="space-y-3">
                {attempts.map((a) => (
                  <div key={a.id} className="flex flex-col gap-2 rounded-md border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium text-foreground">{a.quiz?.title || "Unknown Quiz"}</p>
                      <p className="text-xs text-muted-foreground">{a.quiz?.topic}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <span className="flex items-center gap-1 text-accent font-semibold">
                        <Trophy className="h-3.5 w-3.5" /> {a.score}/{a.total_questions}
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" /> {formatTime(a.time_taken_seconds)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(a.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ProfilePage;
