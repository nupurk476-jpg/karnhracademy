import { getUnitsForSubject, unitRoman } from "@/lib/subjectUnits";

type Topic = { label: string; slug: string };

// Topic chips for the admin upload forms. Unit-based subjects (Labour
// Welfare, MBA/BBA Economics) get their topics grouped under unit headings,
// in syllabus order, so an upload is filed against the right unit; other
// subjects get one flat row.
const chip = (active: boolean) =>
  `rounded-full px-3 py-1 text-xs font-medium transition-colors ${
    active ? "bg-accent text-accent-foreground" : "border border-border bg-card text-muted-foreground hover:bg-muted"
  }`;

export default function UnitTopicPicker({
  subject, topics, value, onChange, hubLabel,
}: { subject: string; topics: readonly Topic[]; value: string; onChange: (slug: string) => void; hubLabel?: string }) {
  const units = getUnitsForSubject(subject);
  if (!units && topics.length === 0) return null;

  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {units ? "Unit & Topic" : "Topic (optional)"}
      </p>
      <div className="mb-2 flex flex-wrap gap-2">
        <button type="button" onClick={() => onChange("")} className={chip(value === "")}>All Topics</button>
      </div>
      {units && value === "" && (
        <p className="mb-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Without a unit topic this upload will NOT appear under any unit on the public {hubLabel ?? "subject"} hub.
          Pick the topic below that matches it.
        </p>
      )}
      {units ? (
        <div className="space-y-3">
          {units.map(u => (
            <div key={u.number}>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-accent-deep">
                Unit {unitRoman(u.number)} · {u.title}
              </p>
              <div className="flex flex-wrap gap-2">
                {u.topics.map(t => (
                  <button key={t.slug} type="button" onClick={() => onChange(t.slug)} className={chip(value === t.slug)}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {topics.map(t => (
            <button key={t.slug} type="button" onClick={() => onChange(t.slug)} className={chip(value === t.slug)}>
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
