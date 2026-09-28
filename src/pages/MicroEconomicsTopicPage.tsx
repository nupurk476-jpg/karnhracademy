import DisciplineTopicPage from "@/components/DisciplineTopicPage";
import { microTopics } from "@/lib/microEconomicsTopics";

const MicroEconomicsTopicPage = () => (
  <DisciplineTopicPage
    subject="micro-eco"
    topics={microTopics}
    backLink="/micro-economics"
    backLabel="All Micro Economics Topics"
    routePrefix="micro-economics"
  />
);

export default MicroEconomicsTopicPage;
