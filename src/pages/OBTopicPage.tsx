import DisciplineTopicPage from "@/components/DisciplineTopicPage";
import { obTopics } from "@/components/OrganizationalBehaviourSection";

const OBTopicPage = () => (
  <DisciplineTopicPage
    subject="ob"
    topics={obTopics}
    backLink="/#ob"
    backLabel="All OB Topics"
    accentBg="bg-accent/10"
    accentText="text-accent"
    routePrefix="ob"
  />
);

export default OBTopicPage;
