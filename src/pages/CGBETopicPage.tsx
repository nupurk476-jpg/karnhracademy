import DisciplineTopicPage from "@/components/DisciplineTopicPage";
import { cgbeTopics } from "@/components/CorporateGovernanceEthicsSection";

const CGBETopicPage = () => (
  <DisciplineTopicPage
    subject="cgbe"
    topics={cgbeTopics}
    backLink="/#cgbe"
    backLabel="All CG & Ethics Topics"
    routePrefix="cgbe"
  />
);

export default CGBETopicPage;
