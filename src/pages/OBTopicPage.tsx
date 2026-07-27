import DisciplineTopicPage from "@/components/DisciplineTopicPage";
import { obTopics } from "@/components/OrganizationalBehaviourSection";

const OBTopicPage = () => (
  <DisciplineTopicPage
    subject="ob"
    topics={obTopics}
    backLink="/notes?subject=ob"
    backLabel="All OB Topics"
    accentBg="bg-accent/10"
    accentText="text-accent-deep"
    routePrefix="ob"
  />
);

export default OBTopicPage;
