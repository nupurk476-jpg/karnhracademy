import { BRAND } from "@/lib/brand";

// Hand-drawn-style subject illustrations, keyed by discipline value. Each is
// an original SVG scene in the brand palette (ink ground, vermillion accent,
// paper-white line work) sized to the 360×202 cover viewBox. A subject
// without an entry here falls back to the geometric motif cover.

const INK = BRAND.navyDeep;
const RED = BRAND.gold;
const PAPER = "rgba(255,255,255,0.88)";
const PAPER_SOFT = "rgba(255,255,255,0.55)";
const PAPER_FAINT = "rgba(255,255,255,0.22)";

const Gear = ({ cx, cy, r, teeth = 8, color = PAPER, width = 2.4 }: { cx: number; cy: number; r: number; teeth?: number; color?: string; width?: number }) => {
  const pts: string[] = [];
  const steps = teeth * 2;
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const rr = i % 2 === 0 ? r : r * 0.78;
    pts.push(`${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`);
  }
  return (
    <g fill="none" stroke={color} strokeWidth={width} strokeLinejoin="round">
      <polygon points={pts.join(" ")} />
      <circle cx={cx} cy={cy} r={r * 0.36} />
    </g>
  );
};

const Person = ({ x, y, s = 1, color = PAPER_SOFT }: { x: number; y: number; s?: number; color?: string }) => (
  <g fill={color} transform={`translate(${x} ${y}) scale(${s})`}>
    <circle cx="0" cy="0" r="5" />
    <path d="M-8 22 C-8 9 8 9 8 22 Z" />
  </g>
);

const Tag = ({ x, y, text, color = PAPER }: { x: number; y: number; text: string; color?: string }) => (
  <g>
    <text x={x} y={y} fontFamily="'Playfair Display', Georgia, serif" fontStyle="italic" fontSize="12.5" fontWeight="600" fill={color}>{text}</text>
    <path d={`M${x} ${y + 3} q ${text.length * 3.2} 2 ${text.length * 6.4} 0`} fill="none" stroke={RED} strokeWidth="1.6" strokeLinecap="round" />
  </g>
);

const HRMArt = () => (
  <g>
    {/* Gears — the "system" of HR */}
    <Gear cx={196} cy={92} r={44} teeth={10} color={RED} width={3} />
    <Gear cx={252} cy={130} r={24} teeth={8} />
    <Gear cx={150} cy={134} r={17} teeth={7} color={PAPER_SOFT} width={2} />

    {/* Growth arrow */}
    <path d="M262 62 L296 34 L292 48 M296 34 L282 36" fill="none" stroke={PAPER} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M226 74 Q244 66 262 62" fill="none" stroke={PAPER} strokeWidth="2.4" strokeLinecap="round" />

    {/* Light bulb — ideas / skill */}
    <g fill="none" stroke={PAPER} strokeWidth="2.2" strokeLinecap="round">
      <path d="M118 62 a14 14 0 1 1 20 12 v6 h-14 v-6 a14 14 0 0 1 -6 -12z" />
      <path d="M124 86 h12 M126 91 h8" />
    </g>
    <path d="M128 44 v-6 M114 50 l-4 -4 M142 50 l4 -4" stroke={RED} strokeWidth="2" strokeLinecap="round" />

    {/* Magnifier — recruitment / search */}
    <g fill="none" stroke={PAPER} strokeWidth="2.4" strokeLinecap="round">
      <circle cx="306" cy="88" r="11" />
      <path d="M314 96 l12 12" />
    </g>

    {/* Pie chart — analytics */}
    <g>
      <circle cx="104" cy="104" r="14" fill="none" stroke={PAPER} strokeWidth="2.2" />
      <path d="M104 104 L104 90 A14 14 0 0 1 117 109 Z" fill={RED} />
    </g>

    {/* Keyword tags — kept clear of the icon tile (top-left) and the exam
        caption (bottom-left), which the cover draws over this art */}
    <Tag x={30} y={92} text="Benefits" />
    <Tag x={36} y={140} text="Career" />
    <Tag x={266} y={22} text="Growth" />
    <Tag x={112} y={158} text="Teamwork" />
    <Tag x={296} y={124} text="Vision" color={PAPER_SOFT} />

    {/* Team — the people, bottom-right so the caption has room on the left */}
    <g>
      {[178, 202, 226, 250, 274, 298, 322, 346].map((x, i) => (
        <Person key={x} x={x} y={174 + (i % 2) * 3} s={0.95} color={i === 2 || i === 6 ? RED : i % 3 === 0 ? PAPER_SOFT : PAPER_FAINT} />
      ))}
    </g>

    {/* Ground line */}
    <path d="M166 199 H356" stroke={PAPER_FAINT} strokeWidth="1" />
  </g>
);

export const SUBJECT_ART: Record<string, () => JSX.Element> = {
  hrm: HRMArt,
};

export const ART_GROUND = `linear-gradient(135deg, #2A2C33 0%, ${INK} 100%)`;
