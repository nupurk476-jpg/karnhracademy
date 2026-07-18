import DisciplineTopicPage from "@/components/DisciplineTopicPage";
import { pomTopics } from "@/components/PrinciplesOfManagementSection";

const POMTopicPage = () => (
  <DisciplineTopicPage
    subject="pom"
    topics={pomTopics}
    backLink="/notes?subject=pom"
    backLabel="All Management Topics"
    routePrefix="pom"
  />
);

export default POMTopicPage;
