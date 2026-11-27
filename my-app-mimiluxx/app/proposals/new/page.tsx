import PageFrame from "@/components/app_navigation/PageFrame";
import { createClient } from "@/lib/supabase/server";
import NewProposalForm from "./NewProposalForm";

export const metadata = { title: "Submit Proposal · MimiLuxx" };

export default async function NewProposalPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    role = profile?.role ?? null;
  }

  return (
    <PageFrame
      active="home"
      eyebrow="Proposals"
      title="Submit a proposal"
      subtitle="Describe your idea clearly. It goes through each approval stage in order, and you can follow its progress from the dashboard."
      backHref="/dashboard?tab=proposals"
      backLabel="Back to proposals"
    >
      <NewProposalForm submitterRole={role} />
    </PageFrame>
  );
}
