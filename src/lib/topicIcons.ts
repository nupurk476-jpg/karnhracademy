import {
  UserPlus, Wallet, TrendingUp, GraduationCap, Crown, Flame,
  AlertTriangle, MessageSquare, Landmark, ShieldCheck, Calendar,
  Target, RefreshCw, Building2, Globe, Gavel, HandHeart, BarChart3,
  Lightbulb, Brain, Users, Star, Handshake, BookOpen, Presentation,
  type LucideIcon,
} from "lucide-react";

// Keyword → icon, checked in order against a topic's label/slug. This way any
// topic (present or future, across every discipline) gets a content-relevant
// icon on its generated cover without hand-mapping each one individually.
const TOPIC_ICON_RULES: [RegExp, LucideIcon][] = [
  [/recruit|selection|staffing|hiring|induction|placement/i, UserPlus],
  [/compensation|benefit|salary|wage|pay\b/i, Wallet],
  [/performance|appraisal|\bkpi\b/i, TrendingUp],
  [/training|development|capacity.build|worker.training/i, GraduationCap],
  [/leadership|leader\b/i, Crown],
  [/motivation/i, Flame],
  [/conflict|stress|grievance|resistance|disciplinary/i, AlertTriangle],
  [/communication|negotiation|persuasion/i, MessageSquare],
  [/governance|board|committee|shareholder|stakeholder/i, Landmark],
  [/ethic|csr|sustainab|\besg\b|fraud|insider/i, ShieldCheck],
  [/planning|plan\b/i, Calendar],
  [/strategy|strategic|competitive|framework|scanning/i, Target],
  [/change|transformation|od intervention|action research|coordinat/i, RefreshCw],
  [/culture|organi[sz]ational|structure|department/i, Building2],
  [/diversity|global|international|cross.cultural|expatriate|\bmnc\b/i, Globe],
  [/\blaw\b|legislation|legal|regulation|\bcode\b|standard/i, Gavel],
  [/welfare|labour|labor|trade union|industrial relation|social security/i, HandHeart],
  [/analytics|\bhris\b|\bdata\b|job evaluation/i, BarChart3],
  [/decision|\bmbo\b|\bmbe\b|quality circle/i, Lightbulb],
  [/perception|personality|individual behaviour|learning/i, Brain],
  [/group|team|dynamics|power|politic|line and staff/i, Users],
  [/talent/i, Star],
  [/employee relation/i, Handshake],
  [/vocabulary|grammar|writing|reading|verbal|idiom|synonym/i, BookOpen],
];

export function iconForTopic(label?: string | null): LucideIcon {
  if (!label) return Presentation;
  for (const [pattern, Icon] of TOPIC_ICON_RULES) {
    if (pattern.test(label)) return Icon;
  }
  return Presentation;
}
