import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Owned = { key: string; title: string; to: string; kind: "Course" | "Note"; when: string };

/** The student's courses and notes, linked straight to where they're read.
 *  Renders nothing for someone who hasn't bought anything. */
const MyPurchases = () => {
  const { data: owned = [] } = useQuery({
    queryKey: ["my-purchases"],
    queryFn: async (): Promise<Owned[]> => {
      const { data: rows, error } = await (supabase.from("purchases" as any) as any)
        .select("item_type, item_id, created_at").order("created_at", { ascending: false });
      // Before the payments migration runs the table doesn't exist; that is
      // "nothing bought", not an error worth showing a student.
      if (error || !rows?.length) return [];
      const ids = (t: string) => rows.filter((r: any) => r.item_type === t).map((r: any) => r.item_id);
      const [courses, notes] = await Promise.all([
        ids("course").length
          ? (supabase.from("courses" as any) as any).select("id, slug, title").in("id", ids("course"))
          : Promise.resolve({ data: [] }),
        ids("note").length
          ? supabase.from("notes").select("id, title").in("id", ids("note"))
          : Promise.resolve({ data: [] }),
      ]);
      const course = new Map<string, any>((courses.data ?? []).map((c: any) => [c.id, c]));
      const note = new Map<string, any>((notes.data ?? []).map((n: any) => [n.id, n]));
      return rows.flatMap((r: any): Owned[] => {
        if (r.item_type === "course" && course.has(r.item_id)) {
          const c = course.get(r.item_id);
          return [{ key: r.item_id, title: c.title, to: `/courses/${c.slug}`, kind: "Course", when: r.created_at }];
        }
        if (r.item_type === "note" && note.has(r.item_id)) {
          return [{ key: r.item_id, title: note.get(r.item_id).title, to: `/notes/view/${r.item_id}`, kind: "Note", when: r.created_at }];
        }
        return [];
      });
    },
  });

  if (owned.length === 0) return null;

  return (
    <div className="mb-10 rounded-lg border border-border bg-card p-6 md:p-8">
      <h2 className="mb-4 text-xl font-bold text-foreground">
        <ShoppingBag className="mr-2 inline h-5 w-5 text-accent-deep" />
        My purchases
      </h2>
      <ul className="divide-y divide-border">
        {owned.map(o => (
          <li key={o.key} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <Link to={o.to} className="font-medium text-foreground hover:text-accent-deep">{o.title}</Link>
              <p className="text-xs text-muted-foreground">
                {o.kind} · bought {new Date(o.when).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
            <Link to={o.to} className="shrink-0 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground hover:brightness-110">
              Open
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MyPurchases;
