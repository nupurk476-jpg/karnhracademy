import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/hooks/use-confirm";
import { Check, Trash2 } from "lucide-react";

const AdminComments = () => {
  const [comments, setComments] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  const load = () => {
    supabase.rpc("get_admin_blog_comments").then(({ data, error }) => {
      if (error) { toast({ title: "Failed to load comments", description: error.message, variant: "destructive" }); return; }
      if (data) {
        setComments(
          (data as any[]).map((c) => ({ ...c, blog_posts: { title: c.blog_post_title } }))
        );
      }
    });
  };

  useEffect(() => { load(); }, []);

  const approve = async (id: string) => {
    const { error } = await supabase.from("blog_comments").update({ approved: true }).eq("id", id);
    if (error) { toast({ title: "Failed to approve comment", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Comment approved" });
    load();
  };

  const remove = async (id: string) => {
    const ok = await confirm({ title: "Delete this comment?", description: "This cannot be undone." });
    if (!ok) return;
    const { error } = await supabase.from("blog_comments").delete().eq("id", id);
    if (error) { toast({ title: "Failed to delete comment", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Comment deleted" });
    load();
  };

  const term = search.trim().toLowerCase();
  const filteredComments = comments.filter(c => {
    if (!term) return true;
    const haystack = [c.name, c.content, (c as any).blog_posts?.title].filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(term);
  });

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-foreground">Comments</h1>
      {comments.length > 0 && (
        <input
          type="text"
          placeholder="Search comments by name, post, or content..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="mb-4 w-full max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      )}
      {comments.length === 0 ? (
        <p className="text-muted-foreground">No comments yet.</p>
      ) : filteredComments.length === 0 ? (
        <p className="rounded-md border border-dashed border-border py-8 text-center text-sm text-muted-foreground">No comments match "{search}".</p>
      ) : (
        <div className="space-y-3">
          {filteredComments.map((c) => (
            <div key={c.id} className="rounded-lg border border-border bg-card p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
                <span className="font-semibold text-foreground">{c.name}</span>
                {c.email && <span className="text-muted-foreground">({c.email})</span>}
                <span className="text-muted-foreground">on {(c as any).blog_posts?.title}</span>
                <span className={`ml-auto rounded-full px-2 py-0.5 text-xs ${c.approved ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                  {c.approved ? "Approved" : "Pending"}
                </span>
              </div>
              <p className="mb-3 text-sm text-muted-foreground">{c.content}</p>
              <div className="flex gap-2">
                {!c.approved && (
                  <button onClick={() => approve(c.id)} className="inline-flex items-center gap-1 rounded-md bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700">
                    <Check className="h-3 w-3" /> Approve
                  </button>
                )}
                <button onClick={() => remove(c.id)} className="inline-flex items-center gap-1 rounded-md bg-destructive px-3 py-1 text-xs text-destructive-foreground hover:opacity-90">
                  <Trash2 className="h-3 w-3" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <ConfirmDialog />
    </div>
  );
};

export default AdminComments;
