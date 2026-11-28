import PageFrame from "@/components/app_navigation/PageFrame";
import TranscriptForm from "@/components/TranscriptForm";
import { loadOrgContext } from "@/lib/orgFolders";
import { canSubmitTranscript } from "@/lib/transcriptAccess";

type Params = { params: Promise<{ slug: string }> };

export const metadata = { title: "Submit transcript · MimiLuxx" };

export default async function TranscriptsPage({ params }: Params) {
  const { slug } = await params;
  const { org, access } = await loadOrgContext(slug);

  return (
    <PageFrame
      active="orgs"
      eyebrow="Organization"
      title="Submit transcript"
      subtitle={`Meeting transcripts and minutes for ${org.name}.`}
      backHref={`/orgs/${org.slug}/folders`}
      backLabel="Back to folders"
    >
      {canSubmitTranscript(access) ? (
        <TranscriptForm slug={org.slug} />
      ) : (
        <p className="rounded-2xl bg-[#F6F6F6] px-5 py-6 text-sm text-[#6b6b6b]">
          Only committee heads and the president can submit transcripts.
        </p>
      )}
    </PageFrame>
  );
}