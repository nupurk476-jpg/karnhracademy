import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Check, Trash2 } from "lucide-react";

const AdminComments = () => {
  const [comments, setComments] = useState<any[]>([]);
  const { toast } = useToast();

  const load = () => {
    supabase.from("blog_comments").select("*, blog_posts(title)").order("created_at", { ascending: false }).then(({ data }) => data && setComments(data));
  };

  useEffect(() => { load(); }, []);

  const approve = async (id: string) => {
    await supabase.from("blog_comments").update({ approved: true }).eq("id", id);
    toast({ title: "Comment approved" });
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("blog_comments").delete().eq("id", id);
    toast({ title: "Comment deleted" });
    load();
  };

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-foreground">Comments</h1>
      {comments.length === 0 ? (
        <p className="text-muted-foreground">No comments yet.</p>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="rounded-lg border border-border bg-card p-4">
              <div className="mb-2 flex items-center gap-2 text-sm">
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
    </div>
  );
};

export default AdminComments;
