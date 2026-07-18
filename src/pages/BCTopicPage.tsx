import DisciplineTopicPage from "@/components/DisciplineTopicPage";
import { bcTopics } from "@/components/BusinessCommunicationSection";

const BCTopicPage = () => (
  <DisciplineTopicPage
    subject="bc"
    topics={bcTopics}
    backLink="/notes?subject=bc"
    backLabel="All Business Communication Topics"
    routePrefix="bc"
  />
);

export default BCTopicPage;
