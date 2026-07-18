import DisciplineTopicPage from "@/components/DisciplineTopicPage";
import { ghrTopics } from "@/components/GlobalHRPracticesSection";

const GHRTopicPage = () => (
  <DisciplineTopicPage
    subject="ghr"
    topics={ghrTopics}
    backLink="/notes?subject=ghr"
    backLabel="All International HRM Topics"
    routePrefix="ghr"
  />
);

export default GHRTopicPage;
