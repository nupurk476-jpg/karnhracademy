import type { LucideIcon } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { SUBJECT_ART } from "@/components/SubjectArt";

// Code-drawn 16:9 cover for a subject card. No image files: every subject —
// including ones added later — gets a cover automatically, in the brand
// palette, at zero bytes. Each subject gets a distinct background motif so
// a grid of nine doesn't read as nine copies of the same tile.

type Motif = "rings" | "grid" | "diagonals" | "dots" | "waves" | "hex" | "bars" | "arcs" | "cross" | "steps";
const MOTIFS: Motif[] = ["rings", "grid", "diagonals", "dots", "waves", "hex", "bars", "arcs", "cross", "steps"];

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

const MotifLayer = ({ motif, id }: { motif: Motif; id: string }) => {
  const stroke = "rgba(23,24,28,0.10)";
  const fill = "rgba(23,24,28,0.07)";
  switch (motif) {
    case "rings":
      return <g fill="none" stroke={stroke} strokeWidth="1.2">{[28, 52, 76, 100, 124].map(r => <circle key={r} cx="300" cy="-4" r={r} />)}</g>;
    case "grid":
      return (
        <>
          <defs><pattern id={`${id}-g`} width="22" height="22" patternUnits="userSpaceOnUse"><path d="M22 0H0V22" fill="none" stroke={stroke} strokeWidth="1" /></pattern></defs>
          <rect x="190" y="0" width="170" height="202" fill={`url(#${id}-g)`} />
        </>
      );
    case "diagonals":
      return <g stroke={stroke} strokeWidth="1.4">{[0, 22, 44, 66, 88, 110, 132].map(o => <line key={o} x1={200 + o} y1="0" x2={300 + o} y2="202" />)}</g>;
    case "dots":
      return (
        <>
          <defs><pattern id={`${id}-d`} width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.6" fill="rgba(23,24,28,0.16)" /></pattern></defs>
          <rect x="200" y="0" width="160" height="202" fill={`url(#${id}-d)`} />
        </>
      );
    case "waves":
      return <g fill="none" stroke={stroke} strokeWidth="1.4">{[0, 18, 36, 54, 72, 90, 108].map(o => <path key={o} d={`M200 ${20 + o} q 25 -14 50 0 t 50 0 t 50 0 t 50 0`} />)}</g>;
    case "hex":
      return (
        <>
          <defs><pattern id={`${id}-h`} width="28" height="24.2" patternUnits="userSpaceOnUse"><path d="M14 0 L28 8.1 L28 16.1 L14 24.2 L0 16.1 L0 8.1 Z" fill="none" stroke={stroke} strokeWidth="1" /></pattern></defs>
          <rect x="196" y="0" width="164" height="202" fill={`url(#${id}-h)`} />
        </>
      );
    case "bars":
      return <g fill={fill}>{[0, 1, 2, 3, 4, 5].map(i => <rect key={i} x={214 + i * 24} y={202 - 30 - i * 26} width="14" height={30 + i * 26} rx="3" />)}</g>;
    case "arcs":
      return <g fill="none" stroke={stroke} strokeWidth="1.4">{[40, 70, 100, 130, 160].map(r => <path key={r} d={`M ${360 - r} 202 A ${r} ${r} 0 0 1 360 ${202 - r}`} />)}</g>;
    case "cross":
      return <g stroke={stroke} strokeWidth="1.2">{[0, 1, 2, 3, 4].map(i => <g key={i}><line x1={230 + i * 30} y1="30" x2={230 + i * 30} y2="172" /><line x1="200" y1={40 + i * 30} x2="360" y2={40 + i * 30} /></g>)}</g>;
    case "steps":
      return <g fill={fill}>{[0, 1, 2, 3, 4].map(i => <rect key={i} x={210 + i * 30} y={150 - i * 28} width="30" height={52 + i * 28} rx="2" />)}</g>;
  }
};

export const SubjectCover = ({
  id, code, caption, icon: Icon, image, accent = BRAND.gold, className = "",
}: { id: string; code: string; caption?: string; icon: LucideIcon; image?: string; accent?: string; className?: string }) => {
  const motif = MOTIFS[hash(id) % MOTIFS.length];
  const uid = `cover-${id}`;
  const Art = SUBJECT_ART[id];
  return (
    <div className={`relative w-full overflow-hidden ${className}`} style={{ aspectRatio: "16/9", background: BRAND.cream }}>
      {image ? (
        <>
          <img src={image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
          {/* Ink scrim so the icon, caption and badge stay legible on any photo */}
          <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, rgba(11,12,14,0.25) 0%, rgba(11,12,14,0.15) 45%, rgba(11,12,14,0.78) 100%)` }} />
          <div className="absolute left-0 top-0 h-full w-1.5" style={{ background: accent }} />
        </>
      ) : (
      <svg viewBox="0 0 360 202" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={BRAND.cream} />
            <stop offset="1" stopColor={BRAND.mist} />
          </linearGradient>
          <radialGradient id={`${uid}-glow`} cx="0.92" cy="0.08" r="0.55">
            <stop offset="0" stopColor={accent} stopOpacity="0.16" />
            <stop offset="1" stopColor={accent} stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="360" height="202" fill={`url(#${uid}-bg)`} />
        <rect width="360" height="202" fill={`url(#${uid}-glow)`} />
        {Art ? <Art /> : (
          <>
            <MotifLayer motif={motif} id={uid} />
            {/* Big short-code watermark, bottom-right — the "picture" of the subject */}
            <text x="348" y="182" textAnchor="end" fontFamily="'Playfair Display', Georgia, serif" fontWeight="800" fontSize="86" fill="rgba(23,24,28,0.08)" letterSpacing="-3">{code}</text>
          </>
        )}
        {/* Vermillion bracket bar — the logo's mark */}
        <rect x="16" y="24" width="5" height="48" rx="2.5" fill={accent} />
      </svg>
      )}

      <div className={`absolute inset-0 flex flex-col justify-between p-5 ${image ? "pl-6" : "pl-10"}`}>
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg" style={{ background: accent }}>
          <Icon className="h-7 w-7 text-white" strokeWidth={2} />
        </span>
        {caption && (
          <p className={`text-[11px] font-bold uppercase tracking-[0.18em] ${image ? "text-white/80" : "text-slate-600"}`}>{caption}</p>
        )}
      </div>
    </div>
  );
};

export default SubjectCover;
