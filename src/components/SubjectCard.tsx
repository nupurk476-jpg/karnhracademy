import { Link } from "react-router-dom";
import { ArrowRight, FileText, HelpCircle, PlayCircle, Layers } from "lucide-react";
import SubjectCover from "@/components/SubjectCover";
import { getSubjectMeta } from "@/lib/subjectMeta";
import { BRAND } from "@/lib/brand";
import type { DISCIPLINES } from "@/lib/disciplines";

type Discipline = typeof DISCIPLINES[number];

type Props = {
  discipline: Discipline;
  notes?: number | null;
  quizzes?: number | null;
  lectures?: number | null;
  // Subjects with fewer notes than this render as "Coming soon" and don't link.
  minNotes?: number;
};

const n = (v: number | null | undefined) => (v === null || v === undefined ? "…" : String(v));

// Product-style subject card: cover, title, hook, exam tags, live inventory,
// CTA. The same layout carries a price tag later for paid test series — free
// and paid subjects sit side by side in the same grid.
const SubjectCard = ({ discipline: d, notes, quizzes, lectures, minNotes = 3 }: Props) => {
  const meta = getSubjectMeta(d.value);
  const comingSoon = notes !== null && notes !== undefined && notes < minNotes;
  const scope = meta.units ?? d.topics.length;
  const scopeWord = meta.units ? "units" : "topics";

  const body = (
    <>
      <div className="relative">
        <SubjectCover id={d.value} code={meta.code} caption={meta.exams.join(" · ")} icon={d.icon} className="rounded-t-2xl" />
        <span
          className="absolute left-3 top-3 rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider"
          style={comingSoon ? { background: "rgba(255,255,255,0.9)", color: BRAND.steelDeep } : { background: "#FFFFFF", color: BRAND.goldText }}
        >
          {comingSoon ? "Coming soon" : "Free"}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-extrabold leading-snug text-slate-900" style={{ letterSpacing: "-0.01em" }}>{d.label}</h3>
        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500">{d.description}</p>

        <dl className="mt-4 grid grid-cols-4 gap-1 border-t border-slate-200 pt-3 text-center">
          {[
            { icon: Layers,     v: scope,        l: scopeWord },
            { icon: FileText,   v: n(notes),     l: "notes" },
            { icon: HelpCircle, v: n(quizzes),   l: "MCQ sets" },
            { icon: PlayCircle, v: n(lectures),  l: "lectures" },
          ].map(s => {
            const I = s.icon;
            return (
              <div key={s.l}>
                <dt className="sr-only">{s.l}</dt>
                <dd className="flex flex-col items-center">
                  <I className="mb-0.5 h-3.5 w-3.5" style={{ color: BRAND.goldText }} />
                  <span className="text-sm font-extrabold tabular-nums text-slate-900">{s.v}</span>
                  <span className="text-[10px] text-slate-500">{s.l}</span>
                </dd>
              </div>
            );
          })}
        </dl>

        <div className="mt-4 flex items-center gap-1.5 text-sm font-bold" style={{ color: comingSoon ? BRAND.steel : BRAND.goldText }}>
          {comingSoon ? "Notes being added" : "Start studying"}
          {!comingSoon && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
        </div>
      </div>
    </>
  );

  const cls = `group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-200 ${
    comingSoon ? "opacity-70" : "hover:-translate-y-1 hover:shadow-xl hover:border-slate-300"
  }`;

  return comingSoon
    ? <div className={cls} aria-disabled="true">{body}</div>
    : <Link to={meta.hub} className={cls} aria-label={`${d.label} — start studying`}>{body}</Link>;
};

export default SubjectCard;
