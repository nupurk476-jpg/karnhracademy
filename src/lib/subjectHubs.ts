import type { DisciplineTopic } from "@/components/DisciplineTopicPage";
import { hrTopics } from "@/components/HRTopicsSection";
import { obTopics } from "@/components/OrganizationalBehaviourSection";
import { smTopics } from "@/components/StrategicManagementSection";
import { pomTopics } from "@/components/PrinciplesOfManagementSection";
import { bcTopics } from "@/components/BusinessCommunicationSection";
import { odcmTopics } from "@/components/OrgDevChangeMgmtSection";
import { ghrTopics } from "@/components/GlobalHRPracticesSection";

// One hub per topic-based subject (unit-based subjects — Labour Welfare and
// the two Economics tracks — have their own dedicated hub pages). Topic
// lists are the same arrays the topic pages route on, so every card on a
// hub is guaranteed to open a real page.
export type SubjectHub = {
  subject: string;
  prefix: string;
  strap: string;
  intro: string;
  topics: DisciplineTopic[];
};

export const SUBJECT_HUBS: Record<string, SubjectHub> = {
  hrm: {
    subject: "hrm", prefix: "hr",
    strap: "MBA · BBA · UGC NET/JRF",
    intro: "From recruitment and compensation to HR analytics and strategic HRM — the core subject for every HR specialisation, organised topic by topic with notes, MCQ practice and video lectures.",
    topics: hrTopics,
  },
  ob: {
    subject: "ob", prefix: "ob",
    strap: "MBA · BBA · UGC NET/JRF",
    intro: "Why people behave the way they do at work — personality, perception, motivation, leadership, group dynamics and culture — with exam-aligned notes and topic-wise MCQs.",
    topics: obTopics,
  },
  sm: {
    subject: "sm", prefix: "sm",
    strap: "MBA · BBA · Semester 5–6",
    intro: "How organisations set direction and win — strategic intent, environmental scanning, SWOT, Porter's frameworks, strategy formulation, implementation and evaluation.",
    topics: smTopics,
  },
  pom: {
    subject: "pom", prefix: "pom",
    strap: "MBA · BBA · B.Com · Semester 1",
    intro: "The foundations every management student starts with — planning, organising, staffing, directing and controlling, plus the thinkers behind them: Fayol, Taylor and the classical school.",
    topics: pomTopics,
  },
  bc: {
    subject: "bc", prefix: "bc",
    strap: "MBA · BBA · B.Com · Semester 1–2",
    intro: "Writing, speaking and presenting for business — the communication process, barriers, business letters and reports, presentations, negotiation and cross-cultural communication.",
    topics: bcTopics,
  },
  odcm: {
    subject: "odcm", prefix: "odcm",
    strap: "MBA HR specialisation · UGC NET/JRF",
    intro: "How organisations change and renew — OD interventions, the action-research model, change management models, managing resistance and organisational transformation.",
    topics: odcmTopics,
  },
  ghr: {
    subject: "ghr", prefix: "ghr",
    strap: "MBA HR specialisation · UGC NET/JRF",
    intro: "Managing people across borders — international staffing, expatriate management, cross-cultural management, global compensation and HR practices in multinational companies.",
    topics: ghrTopics,
  },
};

export function getSubjectHub(subject: string): SubjectHub | undefined {
  return SUBJECT_HUBS[subject];
}
