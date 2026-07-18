import DisciplineTopicPage from "@/components/DisciplineTopicPage";
import { hrTopics } from "@/components/HRTopicsSection";

const HRTopicPage = () => (
  <DisciplineTopicPage
    subject="hrm"
    topics={hrTopics}
    backLink="/notes?subject=hrm"
    backLabel="All HR Topics"
    accentBg="bg-accent/10"
    accentText="text-accent"
    routePrefix="hr"
  />
);

export default HRTopicPage;
