import { BRAND } from "@/lib/brand";

// Hand-drawn-style subject illustrations, keyed by discipline value. Each is
// an original SVG scene in the brand palette (ink ground, vermillion accent,
// paper-white line work) sized to the 360×202 cover viewBox. A subject
// without an entry here falls back to the geometric motif cover.

// Line-work is ink on the site's light ground (cream → mist), so the covers
// sit in the same palette as the rest of the page rather than as dark tiles.
const RED = BRAND.gold;
const PAPER = "rgba(23,24,28,0.82)";
const PAPER_SOFT = "rgba(23,24,28,0.5)";
const PAPER_FAINT = "rgba(23,24,28,0.2)";

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

// Layout rule for every scene: keep x<84,y<78 clear (icon tile) and
// x<180,y>168 clear (exam caption) — the cover draws those over the art.

const S = { fill: "none", stroke: PAPER, strokeWidth: 2.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const S_SOFT = { ...S, stroke: PAPER_SOFT };
const S_RED = { ...S, stroke: RED };

const OBArt = () => (
  <g>
    {/* Team circle with a leader in vermillion */}
    <circle cx="230" cy="100" r="46" {...S_SOFT} strokeDasharray="4 5" />
    {[0, 1, 2, 3, 4, 5].map(i => {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      return <Person key={i} x={230 + Math.cos(a) * 46} y={100 + Math.sin(a) * 46 - 8} s={0.9} color={i === 0 ? RED : PAPER_SOFT} />;
    })}
    {/* Thought bubbles */}
    <g {...S}>
      <path d="M118 78 a16 12 0 1 1 6 22 l-8 8 v-9 a16 12 0 0 1 2 -21z" />
      <circle cx="105" cy="112" r="2.5" /><circle cx="98" cy="119" r="1.6" />
    </g>
    {/* Motivation ladder */}
    <g {...S_RED}>
      <path d="M300 160 V52 M326 160 V52" />
      <path d="M300 70 H326 M300 92 H326 M300 114 H326 M300 136 H326" />
    </g>
    <path d="M334 48 l6 -6 l6 6" {...S_RED} />
    {/* Heart — engagement */}
    <path d="M132 150 c-6 -8 -18 -2 -12 8 c4 6 12 10 12 10 s8 -4 12 -10 c6 -10 -6 -16 -12 -8z" fill={RED} />
    <Tag x={28} y={100} text="Motivation" />
    <Tag x={110} y={54} text="Leadership" />
    <Tag x={196} y={186} text="Culture" color={PAPER_SOFT} />
  </g>
);

const SMArt = () => (
  <g>
    {/* Target with arrow */}
    <g {...S}>
      <circle cx="232" cy="98" r="44" /><circle cx="232" cy="98" r="28" /><circle cx="232" cy="98" r="12" />
    </g>
    <circle cx="232" cy="98" r="5" fill={RED} />
    <path d="M300 30 L236 94" {...S_RED} strokeWidth={2.8} />
    <path d="M300 30 l-14 2 M300 30 l-2 14" {...S_RED} strokeWidth={2.8} />
    {/* SWOT quadrant */}
    <g {...S_SOFT}>
      <rect x="104" y="92" width="64" height="64" rx="4" />
      <path d="M136 92 V156 M104 124 H168" />
    </g>
    {["S", "W", "O", "T"].map((l, i) => (
      <text key={l} x={120 + (i % 2) * 32} y={116 + Math.floor(i / 2) * 32} textAnchor="middle" fontFamily="'Playfair Display', serif" fontWeight="800" fontSize="15" fill={i === 0 ? RED : PAPER}>{l}</text>
    ))}
    {/* Chess pawn */}
    <g fill={PAPER_SOFT}>
      <circle cx="318" cy="118" r="8" />
      <path d="M310 130 h16 l4 22 h-24z" />
      <rect x="302" y="154" width="32" height="6" rx="2" />
    </g>
    <Tag x={26} y={104} text="Strategy" />
    <Tag x={196} y={186} text="Competitive edge" color={PAPER_SOFT} />
    <Tag x={120} y={54} text="Vision" />
  </g>
);

const POMArt = () => {
  const steps = ["Plan", "Organise", "Direct", "Control"];
  const cx = 236, cy = 100, r = 54;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} {...S_SOFT} strokeDasharray="3 6" />
      {steps.map((s, i) => {
        const a = (i / 4) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        return (
          <g key={s}>
            <rect x={x - 30} y={y - 11} width="60" height="22" rx="11" fill={i === 0 ? RED : BRAND.cream} stroke={i === 0 ? RED : PAPER} strokeWidth="2" />
            <text x={x} y={y + 4} textAnchor="middle" fontFamily="'Source Sans 3', sans-serif" fontWeight="700" fontSize="11" fill={i === 0 ? "#fff" : PAPER}>{s}</text>
          </g>
        );
      })}
      {/* Arrows between steps */}
      {[45, 135, 225, 315].map(deg => {
        const a = (deg * Math.PI) / 180;
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        const t = a + Math.PI / 2;
        return <path key={deg} d={`M${x - Math.cos(t) * 5} ${y - Math.sin(t) * 5} L${x + Math.cos(t) * 5} ${y + Math.sin(t) * 5} l-4 -3 M${x + Math.cos(t) * 5} ${y + Math.sin(t) * 5} l-3 4`} {...S_RED} strokeWidth={1.8} />;
      })}
      {/* Clipboard */}
      <g {...S}>
        <rect x="108" y="86" width="44" height="58" rx="4" />
        <rect x="122" y="80" width="16" height="10" rx="2" />
        <path d="M118 106 h24 M118 118 h24 M118 130 h14" />
      </g>
      <Tag x={26} y={100} text="Fayol" />
      <Tag x={118} y={54} text="Taylor" />
      <Tag x={196} y={186} text="Management cycle" color={PAPER_SOFT} />
    </g>
  );
};

const BCArt = () => (
  <g>
    {/* Two speech bubbles in conversation */}
    <g {...S}>
      <path d="M150 74 h84 a10 10 0 0 1 10 10 v30 a10 10 0 0 1 -10 10 h-58 l-14 12 v-12 h-12 a10 10 0 0 1 -10 -10 v-30 a10 10 0 0 1 10 -10z" />
    </g>
    <path d="M166 96 h52 M166 108 h36" {...S_SOFT} />
    <g fill={RED}>
      <path d="M250 112 h64 a8 8 0 0 1 8 8 v24 a8 8 0 0 1 -8 8 h-8 v10 l-12 -10 h-44 a8 8 0 0 1 -8 -8 v-24 a8 8 0 0 1 8 -8z" />
    </g>
    <path d="M264 128 h40 M264 138 h26" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
    {/* Envelope */}
    <g {...S}>
      <rect x="104" y="132" width="44" height="30" rx="3" />
      <path d="M104 136 l22 16 l22 -16" />
    </g>
    {/* Megaphone */}
    <g {...S_SOFT}>
      <path d="M300 44 l30 -12 v46 l-30 -12z M290 50 h10 v12 h-10z M296 62 l4 12" />
      <path d="M338 40 q10 6 0 12 M342 32 q16 12 0 24" />
    </g>
    <Tag x={26} y={104} text="Listen" />
    <Tag x={120} y={54} text="Present" />
    <Tag x={196} y={186} text="Write clearly" color={PAPER_SOFT} />
  </g>
);

const ODCMArt = () => (
  <g>
    {/* Lewin: unfreeze → change → refreeze */}
    {["Unfreeze", "Change", "Refreeze"].map((s, i) => (
      <g key={s}>
        <rect x={112 + i * 82} y={84} width="66" height="30" rx="6" fill={i === 1 ? RED : BRAND.cream} stroke={i === 1 ? RED : PAPER} strokeWidth="2" />
        <text x={145 + i * 82} y={103} textAnchor="middle" fontFamily="'Source Sans 3', sans-serif" fontWeight="700" fontSize="11" fill={i === 1 ? "#fff" : PAPER}>{s}</text>
        {i < 2 && <path d={`M${180 + i * 82} 99 h12 l-4 -4 M${192 + i * 82} 99 l-4 4`} {...S_RED} strokeWidth={2} />}
      </g>
    ))}
    {/* Transformation arc */}
    <path d="M120 150 q80 -60 200 -10" {...S_SOFT} strokeDasharray="4 5" />
    <path d="M320 140 l4 -12 l-12 2" {...S_SOFT} />
    {/* Old block → new block */}
    <rect x="118" y="130" width="22" height="22" rx="3" {...S_SOFT} />
    <rect x="300" y="112" width="26" height="26" rx="13" fill={RED} />
    {/* Sprout — renewal */}
    <g {...S}>
      <path d="M128 60 v-22 M128 44 q-12 -2 -14 -14 q12 2 14 14z M128 38 q12 -2 14 -14 q-12 2 -14 14z" />
    </g>
    <Tag x={26} y={104} text="Change" />
    <Tag x={150} y={54} text="Interventions" />
    <Tag x={196} y={186} text="Renewal" color={PAPER_SOFT} />
  </g>
);

const GHRArt = () => (
  <g>
    {/* Globe */}
    <g {...S}>
      <circle cx="232" cy="98" r="46" />
      <ellipse cx="232" cy="98" rx="18" ry="46" />
      <path d="M186 98 h92 M194 76 h76 M194 120 h76" />
    </g>
    {/* Connection arcs with nodes */}
    <path d="M150 150 q60 -90 150 -60 M120 70 q90 -50 200 20" {...S_RED} strokeDasharray="3 5" strokeWidth={1.8} />
    {[[150, 150], [300, 90], [120, 70], [320, 90]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="4" fill={i % 2 ? PAPER : RED} />)}
    {/* Passport */}
    <g {...S}>
      <rect x="106" y="98" width="34" height="46" rx="3" />
      <circle cx="123" cy="116" r="7" />
      <path d="M113 132 h20" />
    </g>
    {/* Plane */}
    <path d="M304 40 l22 -10 l-6 14 l12 8 l-16 -2 l-8 8 l-2 -10 l-10 -4z" fill={PAPER_SOFT} />
    <Tag x={26} y={104} text="Global" />
    <Tag x={140} y={54} text="Expatriate" />
    <Tag x={196} y={186} text="Cross-cultural" color={PAPER_SOFT} />
  </g>
);

const EcoArt = ({ variant }: { variant: "mba" | "bba" }) => (
  <g>
    {/* Axes */}
    <path d="M124 160 V56 M124 160 H300" {...S} />
    <path d="M124 56 l-4 6 M124 56 l4 6 M300 160 l-6 -4 M300 160 l-6 4" {...S} />
    {/* Demand (falls) and supply (rises) */}
    <path d="M136 66 C180 110 220 140 288 152" {...S} strokeWidth={2.6} />
    <path d="M136 152 C180 130 220 90 288 62" {...S_RED} strokeWidth={2.6} />
    <circle cx="212" cy="112" r="6" fill={RED} stroke="#fff" strokeWidth="2" />
    <path d="M212 112 V160 M124 112 H212" {...S_SOFT} strokeDasharray="3 4" strokeWidth={1.4} />
    <text x="292" y="150" fontFamily="'Source Sans 3', sans-serif" fontWeight="700" fontSize="10" fill={PAPER}>D</text>
    <text x="292" y="60" fontFamily="'Source Sans 3', sans-serif" fontWeight="700" fontSize="10" fill={RED}>S</text>
    {/* Rupee coin */}
    <g>
      <circle cx="322" cy="112" r="20" fill={BRAND.cream} stroke={PAPER} strokeWidth="2.2" />
      <text x="322" y="119" textAnchor="middle" fontFamily="'Source Sans 3', sans-serif" fontWeight="700" fontSize="20" fill={PAPER}>₹</text>
    </g>
    {/* Bars */}
    {variant === "mba"
      ? <g fill={PAPER_FAINT}>{[0, 1, 2, 3].map(i => <rect key={i} x={310 + i * 12} y={166 - i * 10} width="8" height={14 + i * 10} rx="2" />)}</g>
      : <g fill={PAPER_FAINT}><circle cx="326" cy="166" r="14" /><path d="M326 166 L326 152 A14 14 0 0 1 339 170 Z" fill={RED} /></g>}
    <Tag x={26} y={104} text="Demand" />
    <Tag x={120} y={54} text={variant === "mba" ? "Managerial" : "Business"} />
    <Tag x={196} y={186} text="Market equilibrium" color={PAPER_SOFT} />
  </g>
);
const MBAEcoArt = () => <EcoArt variant="mba" />;
const BBAEcoArt = () => <EcoArt variant="bba" />;

const LWArt = () => (
  <g>
    {/* Scales of justice */}
    <g {...S}>
      <path d="M232 52 V150 M200 150 H264 M172 76 H292" />
      <path d="M186 76 l-16 34 h32z M278 76 l-16 34 h32z" />
    </g>
    <circle cx="232" cy="52" r="5" fill={RED} />
    {/* Factory */}
    <g {...S_SOFT}>
      <path d="M104 156 V116 l20 12 v-12 l20 12 v-12 l20 12 v28z" />
      <rect x="110" y="96" width="8" height="24" />
      <path d="M116 140 h8 M132 140 h8 M148 140 h8" />
    </g>
    {/* Shield — social security */}
    <path d="M318 70 l22 8 v22 c0 16 -10 26 -22 32 c-12 -6 -22 -16 -22 -32 v-22z" fill={RED} />
    <path d="M308 100 l7 7 l14 -14" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    {/* Hard hat */}
    <path d="M296 156 a20 12 0 0 1 40 0z M290 156 h52" {...S} />
    <Tag x={26} y={104} text="Welfare" />
    <Tag x={120} y={54} text="Wages" />
    <Tag x={196} y={186} text="Social security" color={PAPER_SOFT} />
  </g>
);

export const SUBJECT_ART: Record<string, () => JSX.Element> = {
  hrm: HRMArt,
  ob: OBArt,
  sm: SMArt,
  pom: POMArt,
  bc: BCArt,
  odcm: ODCMArt,
  ghr: GHRArt,
  "mba-eco": MBAEcoArt,
  "bba-eco": BBAEcoArt,
  lw: LWArt,
};

