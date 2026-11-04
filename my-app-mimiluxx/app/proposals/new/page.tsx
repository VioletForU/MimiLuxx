import PageFrame from "@/components/app_navigation/PageFrame";
import NewProposalForm from "./NewProposalForm";

export const metadata = { title: "Submit Proposal · MimiLuxx" };

export default function NewProposalPage() {
  return (
    <PageFrame
      active="home"
      eyebrow="Proposals"
      title="Submit a proposal"
      subtitle="Describe your idea clearly. It goes through each approval stage in order, and you can follow its progress from the dashboard."
      backHref="/dashboard?tab=proposals"
      backLabel="Back to proposals"
    >
      <NewProposalForm />
    </PageFrame>
  );
}
