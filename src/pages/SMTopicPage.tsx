import DisciplineTopicPage from "@/components/DisciplineTopicPage";
import { smTopics } from "@/components/StrategicManagementSection";

const SMTopicPage = () => (
  <DisciplineTopicPage
    subject="sm"
    topics={smTopics}
    backLink="/sm"
    backLabel="All Strategic Management Topics"
    routePrefix="sm"
  />
);

export default SMTopicPage;
