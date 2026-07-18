import DisciplineTopicPage from "@/components/DisciplineTopicPage";
import { odcmTopics } from "@/components/OrgDevChangeMgmtSection";

const ODCMTopicPage = () => (
  <DisciplineTopicPage
    subject="odcm"
    topics={odcmTopics}
    backLink="/notes?subject=odcm"
    backLabel="All OD & Change Topics"
    routePrefix="odcm"
  />
);

export default ODCMTopicPage;
